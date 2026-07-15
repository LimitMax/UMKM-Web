import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getMidtransTransactionStatus } from '@/lib/payments/midtransClient';
import { processMidtransSubscriptionNotification } from '@/lib/payments/subscriptionPaymentProcessor';

export const runtime = 'nodejs';

interface SyncSubscriptionPaymentBody {
  paymentId?: string;
  businessId?: string;
}

async function verifyAdminBusinessAccess(request: Request, businessId: string) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      error: NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 }),
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      error: NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 }),
    };
  }

  const { data: authProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, business_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !authProfile) {
    return {
      error: NextResponse.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 403 }),
    };
  }

  if (authProfile.role !== 'admin') {
    return {
      error: NextResponse.json({ message: 'Hanya admin yang dapat memeriksa pembayaran langganan.' }, { status: 403 }),
    };
  }

  if (authProfile.business_id !== businessId) {
    return {
      error: NextResponse.json({ message: 'Business ID tidak sesuai dengan akun Anda.' }, { status: 403 }),
    };
  }

  return { supabaseAdmin };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SyncSubscriptionPaymentBody | null;
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId.trim() : '';
    const businessId = typeof body?.businessId === 'string' ? body.businessId.trim() : '';

    if (!paymentId || !businessId) {
      return NextResponse.json({ message: 'Payment ID dan Business ID wajib diisi.' }, { status: 400 });
    }

    const authResult = await verifyAdminBusinessAccess(request, businessId);
    if (authResult.error) return authResult.error;

    const { data: payment, error } = await authResult.supabaseAdmin!
      .from('subscription_payments')
      .select('id, business_id, provider_reference_id')
      .eq('id', paymentId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('[Subscription Midtrans sync] Failed to load payment:', error.message);
      return NextResponse.json({ message: 'Gagal memuat pembayaran langganan.' }, { status: 500 });
    }

    if (!payment?.provider_reference_id) {
      return NextResponse.json({ message: 'Pembayaran langganan tidak ditemukan.' }, { status: 404 });
    }

    const statusPayload = await getMidtransTransactionStatus(payment.provider_reference_id);
    const result = await processMidtransSubscriptionNotification(statusPayload, 'sync');

    return NextResponse.json({
      ok: true,
      paymentId: result.paymentId,
      businessId: result.businessId,
      paymentStatus: result.paymentStatus,
      subscriptionActivated: result.subscriptionActivated,
    });
  } catch (error) {
    console.error('[Subscription Midtrans sync] Failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Gagal cek status pembayaran langganan.' }, { status: 500 });
  }
}
