import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getMidtransTransactionStatus } from '@/lib/payments/midtransClient';
import { processMidtransPaymentNotification } from '@/lib/payments/midtransStatusProcessor';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId')?.trim();

    if (!orderId) {
      return NextResponse.json({ message: 'Order ID wajib diisi.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, business_id, provider, provider_reference_id, payment_method, payment_type, amount, status, snap_token, snap_redirect_url, created_at, paid_at')
      .eq('order_id', orderId)
      .in('provider', ['midtrans', 'midtrans_snap_sandbox'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Midtrans] Failed to load latest payment:', error.message);
      return NextResponse.json({ message: 'Gagal memuat data pembayaran.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ payment: null });
    }

    let activePayment = data;

    if (activePayment.status === 'pending' && activePayment.provider_reference_id) {
      try {
        let customServerKey: string | undefined = undefined;
        const { data: biz } = await supabaseAdmin
          .from('businesses')
          .select('midtrans_server_key')
          .eq('id', activePayment.business_id)
          .maybeSingle();

        if (biz?.midtrans_server_key) {
          customServerKey = biz.midtrans_server_key;
        }

        const statusPayload = await getMidtransTransactionStatus(activePayment.provider_reference_id, customServerKey);
        await processMidtransPaymentNotification(statusPayload, 'sync');

        const { data: refreshed } = await supabaseAdmin
          .from('payments')
          .select('id, business_id, provider, provider_reference_id, payment_method, payment_type, amount, status, snap_token, snap_redirect_url, created_at, paid_at')
          .eq('id', activePayment.id)
          .maybeSingle();

        if (refreshed) {
          activePayment = refreshed;
        }
      } catch (syncErr) {
        console.warn('[Midtrans latest API] Auto-sync failed:', syncErr);
      }
    }

    return NextResponse.json({
      payment: {
        id: activePayment.id,
        provider: activePayment.provider,
        providerReferenceId: activePayment.provider_reference_id,
        paymentMethod: activePayment.payment_method,
        amount: Number(activePayment.amount),
        status: activePayment.status,
        paymentType: activePayment.payment_type,
        snapToken: activePayment.snap_token,
        redirectUrl: activePayment.snap_redirect_url,
        createdAt: activePayment.created_at,
        paidAt: activePayment.paid_at,
      },
    });
  } catch (error) {
    console.error('[Midtrans] Latest payment error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Gagal memuat data pembayaran.' }, { status: 500 });
  }
}
