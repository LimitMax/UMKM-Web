import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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
      .select('id, name, logo_url')
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

    // 3. Fetch order items (only select safe public display fields)
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_name, quantity, price, subtotal')
      .eq('order_id', order.id);

    // 4. Fetch payments to get latest status/snap token
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('status, amount, payment_type, snap_token, redirect_url, provider, created_at')
      .eq('order_id', order.id);

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
        logoUrl: business.logo_url
      },
      order: {
        trackingCode: order.tracking_code,
        queueNumber: order.queue_number,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        fulfillmentType: order.fulfillment_type,
        totalAmount: Number(order.total_amount),
        createdAt: order.created_at,
        customerName: order.customer_name,
        maskedPhone: maskPhone(order.customer_phone),
        
        // Fulfillment delivery fields if applicable
        recipientName: order.fulfillment_type === 'delivery' ? order.recipient_name : null,
        maskedDeliveryPhone: order.fulfillment_type === 'delivery' ? maskPhone(order.delivery_phone) : null,
        deliveryAddress: order.fulfillment_type === 'delivery' ? order.delivery_address : null,
        deliveryNotes: order.fulfillment_type === 'delivery' ? order.delivery_notes : null,
        deliveryDistanceKm: order.fulfillment_type === 'delivery' ? Number(order.delivery_distance_km) : null,
        deliveryFeeAmount: order.fulfillment_type === 'delivery' ? Number(order.delivery_fee_amount) : null,
        deliveryAdminFeeAmount: order.fulfillment_type === 'delivery' ? Number(order.delivery_admin_fee_amount) : null,
        freeDeliveryApplied: order.fulfillment_type === 'delivery' ? order.free_delivery_applied : null,
        notes: order.notes || null,

        // ETA details
        estimatedPreparationMinutes: order.estimated_preparation_minutes,
        estimatedDeliveryMinutes: order.estimated_delivery_minutes,
        estimatedTotalMinutes: order.estimated_total_minutes,
        estimatedReadyAt: order.estimated_ready_at,
        estimatedArrivalAt: order.estimated_arrival_at,
        etaLabel: order.eta_label,
        etaUpdatedAt: order.eta_updated_at,
        etaManuallyAdjusted: order.eta_manually_adjusted,

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
