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
    .single();

  if (profileError || !profile) {
    return { error: NextResponse.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 401 }) };
  }

  if (profile.role !== 'platform_owner') {
    return { error: NextResponse.json({ message: 'Akses terbatas untuk Platform Owner saja.' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

// GET /api/platform/businesses
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;

    const { data: businesses, error } = await supabaseAdmin!
      .from('businesses')
      .select(`
        id,
        name,
        business_type,
        slug,
        plan_code,
        subscription_status,
        trial_ends_at,
        created_at,
        updated_at,
        status,
        suspended_reason,
        suspended_at,
        deleted_at,
        products:products(count),
        orders:orders(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Platform Businesses GET] DB error:', error);
      return NextResponse.json({ message: 'Gagal memuat daftar bisnis.' }, { status: 500 });
    }

    // Fetch owner profiles for each business (role = admin, business_id matches)
    const businessIds = (businesses || []).map((b: { id: string }) => b.id);
    const ownerMap: Record<string, { full_name: string; email: string }> = {};

    if (businessIds.length > 0) {
      const { data: profiles } = await supabaseAdmin!
        .from('profiles')
        .select('business_id, full_name, email')
        .in('business_id', businessIds)
        .eq('role', 'admin');

      // Build map: one owner per business (first match)
      (profiles || []).forEach((p: { business_id: string; full_name: string; email: string }) => {
        if (!ownerMap[p.business_id]) {
          ownerMap[p.business_id] = { full_name: p.full_name, email: p.email };
        }
      });
    }

    interface QueryBusinessRow {
      id: string;
      name: string;
      business_type: string | null;
      slug: string | null;
      plan_code: string | null;
      subscription_status: string | null;
      trial_ends_at: string | null;
      created_at: string;
      updated_at: string;
      status: 'trial' | 'active' | 'suspended' | 'archived' | null;
      suspended_reason: string | null;
      suspended_at: string | null;
      deleted_at: string | null;
      products: Array<{ count: number }>;
      orders: Array<{ count: number }>;
    }

    const enriched = (businesses as unknown as QueryBusinessRow[] || []).map((b: QueryBusinessRow) => ({
      id: b.id,
      name: b.name,
      business_type: b.business_type,
      slug: b.slug,
      plan_code: b.plan_code,
      subscription_status: b.subscription_status,
      trial_ends_at: b.trial_ends_at,
      created_at: b.created_at,
      updated_at: b.updated_at,
      status: b.status ?? 'active',
      suspended_reason: b.suspended_reason,
      suspended_at: b.suspended_at,
      deleted_at: b.deleted_at,
      products_count: b.products?.[0]?.count ?? 0,
      orders_count: b.orders?.[0]?.count ?? 0,
      owner_name: ownerMap[b.id]?.full_name ?? '—',
      owner_email: ownerMap[b.id]?.email ?? '—',
    }));

    return NextResponse.json({ businesses: enriched });
  } catch (error) {
    console.error('[Platform Businesses GET] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
