import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getMidtransTransactionStatus } from '@/lib/payments/midtransClient';
import { processMidtransPaymentNotification } from '@/lib/payments/midtransStatusProcessor';

export const runtime = 'nodejs';

interface SyncBody {
  orderId?: string;
  trackingCode?: string;
  businessSlug?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncBody;
    let orderId = body.orderId?.trim();
    const trackingCode = body.trackingCode?.trim();
    const businessSlug = body.businessSlug?.trim();

    if (!orderId && (!trackingCode || !businessSlug)) {
      return NextResponse.json({ message: 'Order ID atau Kode Cek + Slug wajib diisi.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    if (!orderId && trackingCode && businessSlug) {
      // 1. Resolve business by slug
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('slug', businessSlug.toLowerCase().trim())
        .single();
      
      if (business) {
        // 2. Find order by business_id and tracking_code
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('business_id', business.id)
          .eq('tracking_code', trackingCode.toUpperCase().trim())
          .single();
        
        if (order) {
          orderId = order.id;
        }
      }
    }

    if (!orderId) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, provider_reference_id, business_id')
      .eq('order_id', orderId)
      .in('provider', ['midtrans', 'midtrans_snap_sandbox'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Midtrans sync] Failed to load payment:', error.message);
      return NextResponse.json({ message: 'Gagal memuat pembayaran.' }, { status: 500 });
    }

    if (!payment?.provider_reference_id) {
      return NextResponse.json({ message: 'Pembayaran Midtrans tidak ditemukan.' }, { status: 404 });
    }

    // Fetch merchant-specific server key if configured
    let customServerKey: string | undefined = undefined;
    if (payment.business_id) {
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('midtrans_server_key')
        .eq('id', payment.business_id)
        .maybeSingle();
      if (biz?.midtrans_server_key) {
        customServerKey = biz.midtrans_server_key;
      }
    }

    const statusPayload = await getMidtransTransactionStatus(payment.provider_reference_id, customServerKey);
    const result = await processMidtransPaymentNotification(statusPayload, 'sync');

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      paymentStatus: result.paymentStatus,
      orderPaymentStatus: result.orderPaymentStatus,
      transactionCreated: result.transactionCreated,
    });
  } catch (error) {
    console.error('[Midtrans sync] Failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Gagal cek status Midtrans.' }, { status: 500 });
  }
}

