import { NextResponse } from 'next/server';
import { processMidtransPaymentNotification } from '@/lib/payments/midtransStatusProcessor';
import { MidtransNotificationPayload, verifyMidtransNotification } from '@/lib/payments/midtransClient';
import { processMidtransSubscriptionNotification } from '@/lib/payments/subscriptionPaymentProcessor';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MidtransNotificationPayload;
    let customServerKey: string | undefined = undefined;

    const orderIdStr = payload.order_id || '';

    // Only customer orders (UMKM- prefix) may use a tenant's individual Midtrans key.
    // Subscription payments (SUB- prefix) always use the platform's server key —
    // they intentionally skip this block.
    if (orderIdStr.startsWith('UMKM-')) {
      try {
        const lastHyphenIndex = orderIdStr.lastIndexOf('-');
        if (lastHyphenIndex > 5) {
          const dbOrderId = orderIdStr.slice(5, lastHyphenIndex);
          const supabaseAdmin = createSupabaseAdminClient();

          // Fetch order to get business_id, then look up the tenant's individual Midtrans key
          const { data: order } = await supabaseAdmin
            .from('orders')
            .select('business_id')
            .eq('id', dbOrderId)
            .maybeSingle();

          if (order?.business_id) {
            const { data: business } = await supabaseAdmin
              .from('businesses')
              .select('midtrans_server_key')
              .eq('id', order.business_id)
              .maybeSingle();

            if (business?.midtrans_server_key) {
              customServerKey = business.midtrans_server_key;
            }
          }
        }
      } catch (err) {
        console.error('[Midtrans webhook] Error fetching individual merchant key:', err);
      }
    }

    if (!verifyMidtransNotification(payload, customServerKey)) {
      console.warn('[Midtrans webhook] Invalid signature', {
        orderId: payload.order_id,
        transactionStatus: payload.transaction_status,
      });
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    if (payload.order_id?.startsWith('SUB-')) {
      const result = await processMidtransSubscriptionNotification(payload);
      return NextResponse.json({
        ok: true,
        paymentId: result.paymentId,
        businessId: result.businessId,
        paymentStatus: result.paymentStatus,
        subscriptionActivated: result.subscriptionActivated,
      });
    }

    const result = await processMidtransPaymentNotification(payload);

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      paymentStatus: result.paymentStatus,
      transactionCreated: result.transactionCreated,
    });
  } catch (error) {
    console.error('[Midtrans webhook] Processing failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
