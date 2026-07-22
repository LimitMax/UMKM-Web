import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { MidtransNotificationPayload } from './midtransClient';
import { logPaymentEvent } from './paymentAuditLogger';
import { mapMidtransPaymentTypeToDb } from '@/utils/paymentHelpers';

type AppPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded';

interface ProcessResult {
  paymentId: string;
  orderId: string;
  paymentStatus: AppPaymentStatus;
  orderPaymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus?: 'pending' | 'paid' | 'cancelled';
  transactionCreated: boolean;
  ignoredDowngrade: boolean;
}

interface PaymentRow {
  id: string;
  business_id: string;
  order_id: string;
  provider_reference_id: string;
  payment_method: string;
  amount: number;
  status: string;
}

interface OrderRow {
  id: string;
  business_id: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
}

function resolvePaymentStatus(payload: MidtransNotificationPayload): AppPaymentStatus {
  const transactionStatus = payload.transaction_status;
  const fraudStatus = payload.fraud_status;

  if (transactionStatus === 'settlement') return 'paid';
  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') return 'paid';
    if (fraudStatus === 'deny') return 'failed';
    return 'pending';
  }
  if (transactionStatus === 'pending') return 'pending';
  if (transactionStatus === 'deny') return 'failed';
  if (transactionStatus === 'expire') return 'expired';
  if (transactionStatus === 'cancel') return 'cancelled';
  if (transactionStatus === 'refund' || transactionStatus === 'partial_refund') return 'refunded';

  return 'pending';
}

function toOrderPaymentStatus(status: AppPaymentStatus): 'pending' | 'paid' | 'failed' | 'refunded' {
  if (status === 'paid') return 'paid';
  if (status === 'refunded') return 'refunded';
  if (status === 'pending') return 'pending';
  return 'failed';
}

function shouldIgnoreDowngrade(currentPaymentStatus: string, nextStatus: AppPaymentStatus): boolean {
  if (currentPaymentStatus !== 'paid') return false;
  return nextStatus === 'pending' || nextStatus === 'failed' || nextStatus === 'expired' || nextStatus === 'cancelled';
}

function timestampOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.trim().replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function processMidtransPaymentNotification(
  payload: MidtransNotificationPayload,
  source: 'webhook' | 'sync' = 'webhook'
): Promise<ProcessResult> {
  if (!payload.order_id) {
    throw new Error('Midtrans notification missing order_id.');
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('provider_reference_id', payload.order_id)
    .maybeSingle();

  if (paymentError) {
    throw new Error(`Failed to load payment: ${paymentError.message}`);
  }

  if (!payment) {
    throw new Error('Payment not found for Midtrans provider reference.');
  }

  const paymentRow = payment as PaymentRow;
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', paymentRow.order_id)
    .maybeSingle();

  if (orderError) {
    throw new Error(`Failed to load order: ${orderError.message}`);
  }

  if (!order) {
    throw new Error('Order not found for Midtrans payment.');
  }

  const orderRow = order as OrderRow;
  const resolvedStatus = resolvePaymentStatus(payload);
  const ignoredDowngrade = shouldIgnoreDowngrade(paymentRow.status, resolvedStatus);
  const effectiveStatus = ignoredDowngrade ? (paymentRow.status as AppPaymentStatus) : resolvedStatus;
  const orderPaymentStatus = toOrderPaymentStatus(effectiveStatus);
  const now = new Date().toISOString();
  const isPaid = effectiveStatus === 'paid';
  const settlementTimeIso = timestampOrNull(payload.settlement_time);

  const paymentUpdates: Record<string, unknown> = {
    status: effectiveStatus,
    payment_type: payload.payment_type || null,
    fraud_status: payload.fraud_status || null,
    transaction_time: timestampOrNull(payload.transaction_time),
    settlement_time: settlementTimeIso,
    raw_callback_payload: payload,
    updated_at: now,
  };

  if (isPaid) {
    const paidAtTimestamp = settlementTimeIso || now;
    if (!paymentUpdates.settlement_time) {
      paymentUpdates.settlement_time = paidAtTimestamp;
    }
    paymentUpdates.paid_at = paidAtTimestamp;
  }

  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update(paymentUpdates)
    .eq('id', paymentRow.id);

  if (updatePaymentError) {
    throw new Error(`Failed to update payment: ${updatePaymentError.message}`);
  }

  const orderUpdates: Record<string, unknown> = {
    payment_status: orderPaymentStatus,
    updated_at: now,
  };

  if (isPaid) {
    orderUpdates.paid_at = (paymentUpdates.paid_at as string) || now;
    if (orderRow.order_status === 'pending') {
      orderUpdates.order_status = 'paid';
    }
  }

  if (effectiveStatus === 'expired' || effectiveStatus === 'cancelled') {
    if (orderRow.order_status === 'pending') {
      orderUpdates.order_status = 'cancelled';
      orderUpdates.cancelled_at = now;
    }
  }

  if (ignoredDowngrade) {
    delete orderUpdates.payment_status;
    delete orderUpdates.order_status;
    delete orderUpdates.paid_at;
    delete orderUpdates.cancelled_at;
  }

  const { error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update(orderUpdates)
    .eq('id', orderRow.id);

  if (updateOrderError) {
    throw new Error(`Failed to update order: ${updateOrderError.message}`);
  }

  let transactionCreated = false;
  if (isPaid) {
    try {
      const { data: existingTransaction, error: existingTxError } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('order_id', orderRow.id)
        .limit(1)
        .maybeSingle();

      if (existingTxError) {
        console.warn('[Midtrans Processor] Best-effort check existing transaction failed:', existingTxError.message);
      }

      if (!existingTransaction) {
        const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const mappedPaymentMethod = mapMidtransPaymentTypeToDb(payload.payment_type, orderRow.payment_method);

        const { error: insertTxError } = await supabaseAdmin.from('transactions').insert([{
          id: txId,
          business_id: orderRow.business_id,
          order_id: orderRow.id,
          amount: Number(orderRow.total_amount),
          payment_method: mappedPaymentMethod,
          payment_status: 'paid',
          transaction_status: 'paid',
          created_at: now,
        }]);

        if (insertTxError) {
          console.warn('[Midtrans Processor] Best-effort transaction creation failed:', insertTxError.message);
        } else {
          transactionCreated = true;
        }
      }
    } catch (txErr) {
      console.warn('[Midtrans Processor] Non-blocking exception during transaction creation:', txErr);
    }
  }

  if (effectiveStatus === 'refunded') {
    try {
      await supabaseAdmin
        .from('transactions')
        .update({
          payment_status: 'refunded',
          transaction_status: 'refunded',
        })
        .eq('order_id', orderRow.id);
    } catch (refundTxErr) {
      console.warn('[Midtrans Processor] Non-blocking exception during transaction refund update:', refundTxErr);
    }
  }

  // Log payment event (best-effort audit log)
  await logPaymentEvent({
    business_id: paymentRow.business_id,
    order_id: paymentRow.order_id,
    payment_id: paymentRow.id,
    provider: 'midtrans',
    provider_reference_id: paymentRow.provider_reference_id,
    event_type: source === 'sync' ? 'manual_sync' : 'webhook_received',
    previous_status: paymentRow.status,
    new_status: effectiveStatus,
    transaction_status: payload.transaction_status || null,
    fraud_status: payload.fraud_status || null,
    raw_payload: payload
  });

  return {
    paymentId: paymentRow.id,
    orderId: orderRow.id,
    paymentStatus: effectiveStatus,
    orderPaymentStatus,
    orderStatus: orderUpdates.order_status as ProcessResult['orderStatus'],
    transactionCreated,
    ignoredDowngrade,
  };
}

