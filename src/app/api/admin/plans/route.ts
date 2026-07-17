import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

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
    return { error: NextResponse.json({ message: 'Akses terbatas untuk Pemilik Platform saja.' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

// GET all plans
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { data: plans, error } = await authResult.supabaseAdmin!
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ message: 'Gagal memuat paket.' }, { status: 500 });
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('[Admin Plans GET API] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to update a plan's prices
export async function PUT(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const body = await request.json().catch(() => null);
    const planId = typeof body?.planId === 'string' ? body.planId.trim() : '';
    const priceMonthly = typeof body?.priceMonthly === 'number' ? Math.max(0, body.priceMonthly) : null;
    const priceAnnual = typeof body?.priceAnnual === 'number' ? Math.max(0, body.priceAnnual) : null;

    if (!planId || priceMonthly === null || priceAnnual === null) {
      return NextResponse.json({ message: 'Payload update paket tidak valid.' }, { status: 400 });
    }

    const { data, error } = await authResult.supabaseAdmin!
      .from('plans')
      .update({
        price_monthly: priceMonthly,
        price_annual: priceAnnual,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ message: 'Gagal memperbarui harga paket.' }, { status: 500 });
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error('[Admin Plans PUT API] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
