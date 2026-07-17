import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Helper to check platform owner role
async function verifyPlatformOwner(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { error: NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 }) };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return { error: NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'platform_owner') {
    return { error: NextResponse.json({ message: 'Akses ditolak. Khusus Platform Owner.' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

// GET: List all plans
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const { data: plans, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    // Load limits for plans
    const { data: features } = await supabaseAdmin
      .from('plan_features')
      .select('*');

    const plansWithFeatures = (plans || []).map(p => {
      const planFeats = (features || []).filter(f => f.plan_id === p.id);
      const productLimit = planFeats.find(f => f.feature_key === 'products')?.feature_limit ?? p.product_limit ?? 100;
      return {
        ...p,
        product_limit: productLimit,
        features: planFeats
      };
    });

    return NextResponse.json({ plans: plansWithFeatures });
  } catch (error) {
    console.error('[API Platform Plans GET] Error:', error);
    return NextResponse.json({ message: 'Gagal memuat paket langganan.' }, { status: 500 });
  }
}

// POST: Create a new plan
export async function POST(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const body = await request.json();

    const {
      name,
      price,
      billing_cycle,
      trial_days,
      description,
      status,
      product_limit
    } = body;

    if (!name || typeof price !== 'number') {
      return NextResponse.json({ message: 'Nama dan harga wajib diisi.' }, { status: 400 });
    }

    const code = 'plan-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();
    const id = `plan-${Date.now()}`;

    // Get max sort_order
    const { data: maxPlan } = await supabaseAdmin
      .from('plans')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSortOrder = (maxPlan?.sort_order ?? 0) + 1;

    const priceNum = Number(price);
    const trialDaysNum = Number(trial_days || 0);
    const isMonthly = billing_cycle === 'annual' ? false : true;

    const { error: insertError } = await supabaseAdmin
      .from('plans')
      .insert([{
        id,
        code,
        name,
        description: description || null,
        price_monthly: isMonthly ? priceNum : Math.round(priceNum / 12),
        price_annual: isMonthly ? priceNum * 12 : priceNum,
        price: priceNum,
        billing_cycle: billing_cycle || 'monthly',
        trial_days: trialDaysNum,
        status: status || 'active',
        is_active: status === 'archived' ? false : true,
        sort_order: nextSortOrder,
        product_limit: Number(product_limit || 100),
        order_limit_monthly: 5000,
        cashier_limit: 10,
        ai_enabled: true,
        midtrans_enabled: true,
        report_export_enabled: true
      }]);

    if (insertError) {
      throw insertError;
    }

    // Insert to plan_features
    await supabaseAdmin
      .from('plan_features')
      .insert([{
        plan_id: id,
        feature_key: 'products',
        feature_limit: Number(product_limit || 100)
      }]);

    return NextResponse.json({ success: true, planId: id });
  } catch (error) {
    console.error('[API Platform Plans POST] Error:', error);
    return NextResponse.json({ message: 'Gagal membuat paket langganan.' }, { status: 550 });
  }
}
