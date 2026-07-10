import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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
      .select('id, provider, provider_reference_id, payment_method, payment_type, amount, status, snap_token, snap_redirect_url, created_at, paid_at')
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

    return NextResponse.json({
      payment: {
        id: data.id,
        provider: data.provider,
        providerReferenceId: data.provider_reference_id,
        paymentMethod: data.payment_method,
        amount: Number(data.amount),
        status: data.status,
        paymentType: data.payment_type,
        snapToken: data.snap_token,
        redirectUrl: data.snap_redirect_url,
        createdAt: data.created_at,
        paidAt: data.paid_at,
      },
    });
  } catch (error) {
    console.error('[Midtrans] Latest payment error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Gagal memuat data pembayaran.' }, { status: 500 });
  }
}
