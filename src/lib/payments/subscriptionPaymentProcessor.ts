import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { MidtransNotificationPayload } from './midtransClient';

type SubscriptionPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded';

interface SubscriptionPaymentRow {
  id: string;
  business_id: string;
  subscription_id: string | null;
  plan_id: string | null;
  provider_reference_id: string;
  amount: number;
  status: string;
  billing_cycle: string;
}

interface ProcessSubscriptionPaymentResult {
  paymentId: string;
  businessId: string;
  paymentStatus: SubscriptionPaymentStatus;
  subscriptionActivated: boolean;
  ignoredDowngrade: boolean;
}

function resolvePaymentStatus(payload: MidtransNotificationPayload): SubscriptionPaymentStatus {
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

function shouldIgnoreDowngrade(currentPaymentStatus: string, nextStatus: SubscriptionPaymentStatus): boolean {
  if (currentPaymentStatus !== 'paid') return false;
  return nextStatus === 'pending' || nextStatus === 'failed' || nextStatus === 'expired' || nextStatus === 'cancelled';
}

function timestampOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function nextBillingPeriodEnd(from: Date, billingCycle = 'monthly'): string {
  const end = new Date(from);
  if (billingCycle === 'annual') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end.toISOString();
}

export async function processMidtransSubscriptionNotification(
  payload: MidtransNotificationPayload,
  source: 'webhook' | 'sync' = 'webhook'
): Promise<ProcessSubscriptionPaymentResult> {
  if (!payload.order_id) {
    throw new Error('Midtrans notification missing subscription payment order_id.');
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('subscription_payments')
    .select('*')
    .eq('provider_reference_id', payload.order_id)
    .maybeSingle();

  if (paymentError) {
    throw new Error(`Failed to load subscription payment: ${paymentError.message}`);
  }

  if (!payment) {
    throw new Error('Subscription payment not found for Midtrans provider reference.');
  }

  const paymentRow = payment as SubscriptionPaymentRow;
  const resolvedStatus = resolvePaymentStatus(payload);
  const ignoredDowngrade = shouldIgnoreDowngrade(paymentRow.status, resolvedStatus);
  const effectiveStatus = ignoredDowngrade ? (paymentRow.status as SubscriptionPaymentStatus) : resolvedStatus;
  const now = new Date();
  const nowIso = now.toISOString();
  const isPaid = effectiveStatus === 'paid';

  const paymentUpdates: Record<string, unknown> = {
    status: effectiveStatus,
    payment_type: payload.payment_type || null,
    fraud_status: payload.fraud_status || null,
    transaction_time: timestampOrNull(payload.transaction_time),
    settlement_time: timestampOrNull(payload.settlement_time),
    raw_callback_payload: payload,
    updated_at: nowIso,
    webhook_received_at: source === 'webhook' ? nowIso : null,
    last_webhook_status: payload.status_code || null,
    last_webhook_transaction_status: payload.transaction_status || null,
  };

  if (isPaid && !paymentUpdates.settlement_time) {
    paymentUpdates.settlement_time = nowIso;
  }
  if (isPaid) {
    paymentUpdates.paid_at = nowIso;
  }

  const { error: updatePaymentError } = await supabaseAdmin
    .from('subscription_payments')
    .update(paymentUpdates)
    .eq('id', paymentRow.id);

  if (updatePaymentError) {
    throw new Error(`Failed to update subscription payment: ${updatePaymentError.message}`);
  }

  let subscriptionActivated = false;
  if (isPaid) {
    const periodEnd = nextBillingPeriodEnd(now, paymentRow.billing_cycle);
    const subscriptionUpdates: Record<string, unknown> = {
      status: 'active',
      billing_cycle: paymentRow.billing_cycle || 'monthly',
      trial_ends_at: null,
      paid_at: nowIso,
      current_period_start: nowIso,
      current_period_end: periodEnd,
      updated_at: nowIso,
    };

    const businessUpdates = {
      subscription_status: 'active',
      trial_ends_at: null,
      updated_at: nowIso,
    };

    if (paymentRow.subscription_id) {
      const { error: updateSubError } = await supabaseAdmin
        .from('business_subscriptions')
        .update(subscriptionUpdates)
        .eq('id', paymentRow.subscription_id);

      if (updateSubError) {
        throw new Error(`Failed to activate subscription: ${updateSubError.message}`);
      }
    } else {
      const { error: updateSubError } = await supabaseAdmin
        .from('business_subscriptions')
        .update(subscriptionUpdates)
        .eq('business_id', paymentRow.business_id);

      if (updateSubError) {
        throw new Error(`Failed to activate subscription: ${updateSubError.message}`);
      }
    }

    const { error: updateBusinessError } = await supabaseAdmin
      .from('businesses')
      .update(businessUpdates)
      .eq('id', paymentRow.business_id);

    if (updateBusinessError) {
      throw new Error(`Failed to activate business subscription: ${updateBusinessError.message}`);
    }

    subscriptionActivated = true;
  }

  return {
    paymentId: paymentRow.id,
    businessId: paymentRow.business_id,
    paymentStatus: effectiveStatus,
    subscriptionActivated,
    ignoredDowngrade,
  };
}
