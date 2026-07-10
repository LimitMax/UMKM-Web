// src/lib/payments/paymentAuditLogger.ts

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface PaymentEventInput {
  business_id: string;
  order_id: string;
  payment_id?: string | null;
  provider: string;
  provider_reference_id?: string | null;
  event_type: string;
  previous_status?: string | null;
  new_status?: string | null;
  transaction_status?: string | null;
  fraud_status?: string | null;
  raw_payload: Record<string, unknown> | null | undefined;
}

/**
 * Log payment events to payment_events table.
 * This is implemented as a best-effort audit logging. Failure is caught and logged as a warning.
 */
export async function logPaymentEvent(event: PaymentEventInput): Promise<void> {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const id = `pe-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const { error } = await supabaseAdmin
      .from('payment_events')
      .insert([{
        id,
        business_id: event.business_id,
        order_id: event.order_id,
        payment_id: event.payment_id || null,
        provider: event.provider,
        provider_reference_id: event.provider_reference_id || null,
        event_type: event.event_type,
        previous_status: event.previous_status || null,
        new_status: event.new_status || null,
        transaction_status: event.transaction_status || null,
        fraud_status: event.fraud_status || null,
        raw_payload: event.raw_payload || {},
        created_at: new Date().toISOString()
      }]);
    if (error) {
      console.warn('[Audit Logger] best-effort logging failed:', error.message);
    }
  } catch (err) {
    console.warn('[Audit Logger] best-effort logging exception:', err);
  }
}
