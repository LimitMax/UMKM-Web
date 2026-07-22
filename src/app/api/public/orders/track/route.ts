import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getMidtransTransactionStatus } from '@/lib/payments/midtransClient';
import { processMidtransPaymentNotification } from '@/lib/payments/midtransStatusProcessor';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessSlug, trackingCode } = body;

    if (!businessSlug || typeof businessSlug !== 'string' || !businessSlug.trim()) {
      return NextResponse.json(
        { message: 'Pesanan tidak ditemukan. Pastikan kode cek sudah benar.' },
        { status: 400 }
      );
    }

    if (!trackingCode || typeof trackingCode !== 'string' || !trackingCode.trim()) {
      return NextResponse.json(
        { message: 'Pesanan tidak ditemukan. Pastikan kode cek sudah benar.' },
        { status: 400 }
      );
    }

    const normalizedCode = trackingCode.trim().toUpperCase();
    const normalizedSlug = businessSlug.trim().toLowerCase();

    const supabaseAdmin = createSupabaseAdminClient();

    // 1. Resolve business by slug and verify public_order_enabled
    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, logo_url, midtrans_client_key')
      .eq('slug', normalizedSlug)
      .eq('public_order_enabled', true)
      .maybeSingle();

    if (bizError || !business) {
      return NextResponse.json(
        { message: 'Pesanan tidak ditemukan. Pastikan kode cek sudah benar.' },
        { status: 404 }
      );
    }

    // 2. Find order by business_id and tracking_code
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .eq('tracking_code', normalizedCode)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { message: 'Pesanan tidak ditemukan. Pastikan kode cek sudah benar.' },
        { status: 404 }
      );
    }

    let activeOrder = order;

    // Auto-sync with Midtrans API if payment is pending for non-cash order
    if (activeOrder.payment_status === 'pending' && activeOrder.payment_method === 'non_cash') {
      const { data: pendingPayment } = await supabaseAdmin
        .from('payments')
        .select('id, provider_reference_id, business_id')
        .eq('order_id', activeOrder.id)
        .in('provider', ['midtrans', 'midtrans_snap_sandbox'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingPayment?.provider_reference_id) {
        try {
          let customServerKey: string | undefined = undefined;
          const { data: bizData } = await supabaseAdmin
            .from('businesses')
            .select('midtrans_server_key')
            .eq('id', pendingPayment.business_id)
            .maybeSingle();

          if (bizData?.midtrans_server_key) {
            customServerKey = bizData.midtrans_server_key;
          }

          const statusPayload = await getMidtransTransactionStatus(pendingPayment.provider_reference_id, customServerKey);
          await processMidtransPaymentNotification(statusPayload, 'sync');

          // Re-fetch updated order status from DB
          const { data: refreshedOrder } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', activeOrder.id)
            .maybeSingle();

          if (refreshedOrder) {
            activeOrder = refreshedOrder;
          }
        } catch (syncErr) {
          console.warn('[Public track API] Best-effort auto-sync with Midtrans failed:', syncErr instanceof Error ? syncErr.message : syncErr);
        }
      }
    }

    // 3. Fetch order items (only select safe public display fields)
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_name, quantity, price, subtotal')
      .eq('order_id', activeOrder.id);

    // 4. Fetch payments to get latest status/snap token
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('status, amount, payment_type, snap_token, redirect_url, provider, created_at')
      .eq('order_id', activeOrder.id);

    const latestPayment = payments && payments.length > 0
      ? [...payments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).pop()
      : null;

    // Helper to mask phone numbers safely (e.g. 0812****5678)
    const maskPhone = (phone: string | null | undefined): string => {
      if (!phone) return '';
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length <= 8) {
        return cleaned.slice(0, 3) + '*'.repeat(cleaned.length - 3);
      }
      return cleaned.slice(0, 4) + '*'.repeat(cleaned.length - 8) + cleaned.slice(-4);
    };

    // Return safe order status data only
    return NextResponse.json({
      success: true,
      business: {
        name: business.name,
        logoUrl: business.logo_url,
        midtransClientKey: business.midtrans_client_key || null
      },
      order: {
        trackingCode: activeOrder.tracking_code,
        queueNumber: activeOrder.queue_number,
        orderStatus: activeOrder.order_status,
        paymentStatus: activeOrder.payment_status,
        paymentMethod: activeOrder.payment_method,
        fulfillmentType: activeOrder.fulfillment_type,
        totalAmount: Number(activeOrder.total_amount),
        createdAt: activeOrder.created_at,
        customerName: activeOrder.customer_name,
        maskedPhone: maskPhone(activeOrder.customer_phone),
        
        // Fulfillment delivery fields if applicable
        recipientName: activeOrder.fulfillment_type === 'delivery' ? activeOrder.recipient_name : null,
        maskedDeliveryPhone: activeOrder.fulfillment_type === 'delivery' ? maskPhone(activeOrder.delivery_phone) : null,
        deliveryAddress: activeOrder.fulfillment_type === 'delivery' ? activeOrder.delivery_address : null,
        deliveryNotes: activeOrder.fulfillment_type === 'delivery' ? activeOrder.delivery_notes : null,
        deliveryDistanceKm: activeOrder.fulfillment_type === 'delivery' ? Number(activeOrder.delivery_distance_km) : null,
        deliveryFeeAmount: activeOrder.fulfillment_type === 'delivery' ? Number(activeOrder.delivery_fee_amount) : null,
        deliveryAdminFeeAmount: activeOrder.fulfillment_type === 'delivery' ? Number(activeOrder.delivery_admin_fee_amount) : null,
        freeDeliveryApplied: activeOrder.fulfillment_type === 'delivery' ? activeOrder.free_delivery_applied : null,
        notes: activeOrder.notes || null,

        // ETA details
        estimatedPreparationMinutes: activeOrder.estimated_preparation_minutes,
        estimatedDeliveryMinutes: activeOrder.estimated_delivery_minutes,
        estimatedTotalMinutes: activeOrder.estimated_total_minutes,
        estimatedReadyAt: activeOrder.estimated_ready_at,
        estimatedArrivalAt: activeOrder.estimated_arrival_at,
        etaLabel: activeOrder.eta_label,
        etaUpdatedAt: activeOrder.eta_updated_at,
        etaManuallyAdjusted: activeOrder.eta_manually_adjusted,

        // Items
        items: items || [],

        // Safe payment details for continuation
        latestPayment: latestPayment ? {
          status: latestPayment.status,
          amount: Number(latestPayment.amount),
          paymentType: latestPayment.payment_type,
          snapToken: latestPayment.snap_token,
          redirectUrl: latestPayment.redirect_url,
          provider: latestPayment.provider
        } : null
      }
    });

  } catch (error) {
    console.error('Public track API exception:', error);
    return NextResponse.json(
      { message: 'Pesanan tidak ditemukan. Pastikan kode cek sudah benar.' },
      { status: 500 }
    );
  }
}
