import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSnapTransaction, MidtransSnapTransactionPayload } from '@/lib/payments/midtransClient';

export const runtime = 'nodejs';

interface CreateSubscriptionPaymentBody {
  businessId?: string;
}

interface AuthProfileRow {
  role: string;
  business_id: string;
  full_name?: string | null;
  email?: string | null;
}

function normalizeAmount(value: number | string | null | undefined): number {
  return Math.max(0, Math.round(Number(value || 0)));
}

function buildSubscriptionMidtransOrderId(businessId: string): string {
  const safeBusinessId = businessId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 28);
  return `SUB-${safeBusinessId}-${Date.now()}`;
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
    .select('role, business_id, full_name, email')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !authProfile) {
    return {
      error: NextResponse.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 403 }),
    };
  }

  const profile = authProfile as AuthProfileRow;
  if (profile.role !== 'admin') {
    return {
      error: NextResponse.json({ message: 'Hanya admin yang dapat membayar langganan.' }, { status: 403 }),
    };
  }

  if (profile.business_id !== businessId) {
    return {
      error: NextResponse.json({ message: 'Business ID tidak sesuai dengan akun Anda.' }, { status: 403 }),
    };
  }

  return { supabaseAdmin, profile };
}

interface CreateSubscriptionPaymentBody {
  businessId?: string;
  billingCycle?: string;
  couponCode?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as CreateSubscriptionPaymentBody | null;
    const businessId = typeof body?.businessId === 'string' ? body.businessId.trim() : '';

    if (!businessId) {
      return NextResponse.json({ message: 'Business ID wajib diisi.' }, { status: 400 });
    }

    const authResult = await verifyAdminBusinessAccess(request, businessId);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin, profile } = authResult;
    const { data: business, error: businessError } = await supabaseAdmin!
      .from('businesses')
      .select('id, name, plan_code')
      .eq('id', businessId)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ message: 'Bisnis tidak ditemukan.' }, { status: 404 });
    }

    const { data: plan, error: planError } = await supabaseAdmin!
      .from('plans')
      .select('id, code, name, price_monthly, price_annual')
      .eq('code', business.plan_code || 'starter')
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json({ message: 'Paket langganan tidak ditemukan.' }, { status: 404 });
    }

    const billingCycle = body?.billingCycle === 'annual' ? 'annual' : 'monthly';
    const basePrice = billingCycle === 'annual' ? (plan.price_annual || 0) : plan.price_monthly;
    
    let grossAmount = normalizeAmount(basePrice);
    if (grossAmount <= 0) {
      return NextResponse.json({ message: 'Pilih paket berbayar untuk mengaktifkan langganan.' }, { status: 400 });
    }

    // Coupon discount application
    const couponCode = typeof body?.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : '';
    let discountAmount = 0;
    if (couponCode) {
      const { data: coupon } = await supabaseAdmin!
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .maybeSingle();

      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = Math.round((grossAmount * coupon.discount_value) / 100);
        } else if (coupon.discount_type === 'fixed') {
          discountAmount = coupon.discount_value;
        }
        grossAmount = Math.max(0, grossAmount - discountAmount);
      }
    }

    const { data: subscription } = await supabaseAdmin!
      .from('business_subscriptions')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    const midtransOrderId = buildSubscriptionMidtransOrderId(businessId);
    const snapPayload: MidtransSnapTransactionPayload = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: profile!.full_name || 'Owner UMKM',
        email: profile!.email || undefined,
      },
      item_details: [
        {
          id: `subscription-${plan.code}`,
          name: `Langganan ${plan.name} (${billingCycle === 'annual' ? 'Tahunan' : 'Bulanan'})`.slice(0, 50),
          price: grossAmount,
          quantity: 1,
        },
      ],
    };

    // Always use the platform's Midtrans server key for subscription billing.
    // Never pass a tenant's customServerKey here — subscription payments belong
    // to the platform account, not the individual tenant's merchant account.
    const snap = await createSnapTransaction(snapPayload);

    const now = new Date().toISOString();
    const paymentId = `subpay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const { error: insertError } = await supabaseAdmin!.from('subscription_payments').insert([{
      id: paymentId,
      business_id: businessId,
      subscription_id: subscription?.id || null,
      plan_id: plan.id,
      owner_email: (profile!.email || '').trim().toLowerCase(),
      provider: 'midtrans',
      provider_reference_id: midtransOrderId,
      amount: grossAmount,
      billing_cycle: billingCycle,
      coupon_code: couponCode || null,
      status: 'pending',
      snap_token: snap.token,
      snap_redirect_url: snap.redirect_url || null,
      raw_callback_payload: snap,
      created_at: now,
      updated_at: now,
    }]);

    if (insertError) {
      console.error('[Subscription Midtrans] Failed to save payment:', insertError.message);
      return NextResponse.json({ message: 'Transaksi dibuat, tetapi metadata pembayaran gagal disimpan.' }, { status: 500 });
    }

    return NextResponse.json({
      snapToken: snap.token,
      redirectUrl: snap.redirect_url || null,
      paymentId,
      providerReferenceId: midtransOrderId,
    });
  } catch (error) {
    console.error('[Subscription Midtrans] Create payment failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Pembayaran langganan sedang tidak tersedia.' }, { status: 500 });
  }
}
