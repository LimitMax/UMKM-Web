import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getMidtransTransactionStatus } from '@/lib/payments/midtransClient';
import { processMidtransPaymentNotification } from '@/lib/payments/midtransStatusProcessor';

export const runtime = 'nodejs';

interface SyncBody {
  orderId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncBody;
    const orderId = body.orderId?.trim();

    if (!orderId) {
      return NextResponse.json({ message: 'Order ID wajib diisi.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, provider_reference_id')
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

    const statusPayload = await getMidtransTransactionStatus(payment.provider_reference_id);
    const result = await processMidtransPaymentNotification(statusPayload);

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

