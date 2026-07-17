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

// PUT: Update a plan
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
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

    const priceNum = Number(price);
    const trialDaysNum = Number(trial_days || 0);
    const isMonthly = billing_cycle === 'annual' ? false : true;

    const { error: updateError } = await supabaseAdmin
      .from('plans')
      .update({
        name,
        description: description || null,
        price_monthly: isMonthly ? priceNum : Math.round(priceNum / 12),
        price_annual: isMonthly ? priceNum * 12 : priceNum,
        price: priceNum,
        billing_cycle: billing_cycle || 'monthly',
        trial_days: trialDaysNum,
        status: status || 'active',
        is_active: status === 'archived' ? false : true,
        product_limit: Number(product_limit || 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Upsert products limit in plan_features
    await supabaseAdmin
      .from('plan_features')
      .upsert({
        plan_id: id,
        feature_key: 'products',
        feature_limit: Number(product_limit || 100)
      }, { onConflict: 'plan_id,feature_key' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Platform Plans PUT] Error:', error);
    return NextResponse.json({ message: 'Gagal memperbarui paket langganan.' }, { status: 500 });
  }
}

// DELETE: Archive a plan (Soft Delete)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;

    const { error: updateError } = await supabaseAdmin
      .from('plans')
      .update({
        status: 'archived',
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Platform Plans DELETE] Error:', error);
    return NextResponse.json({ message: 'Gagal mengarsipkan paket langganan.' }, { status: 500 });
  }
}
