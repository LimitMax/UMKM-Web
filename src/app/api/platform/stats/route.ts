import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Verifies that the request comes from a platform_owner by:
 * 1. Extracting the Bearer token from the Authorization header.
 * 2. Resolving the user via the admin client.
 * 3. Checking profiles.role === 'platform_owner'.
 */
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

// GET /api/platform/stats
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;

    // Build today's date range (UTC)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      totalBusinessesRes,
      activeBusinessesRes,
      todayOrdersRes,
      todayRevenueRes,
      activeSubsRes,
      trialBusinessesRes,
    ] = await Promise.all([
      // Total businesses
      supabaseAdmin!.from('businesses').select('id', { count: 'exact', head: true }),

      // Active businesses (subscription_status = 'active')
      supabaseAdmin!
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'active'),

      // Today's orders count
      supabaseAdmin!
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),

      // Today's revenue (paid orders)
      supabaseAdmin!
        .from('orders')
        .select('total_amount')
        .gte('created_at', todayStart.toISOString())
        .eq('payment_status', 'Paid'),

      // Active subscriptions
      supabaseAdmin!
        .from('business_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Trial businesses
      supabaseAdmin!
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'trialing'),
    ]);

    // Sum today's revenue
    const todayRevenue = (todayRevenueRes.data || []).reduce(
      (sum: number, row: { total_amount: number | string }) =>
        sum + (Number(row.total_amount) || 0),
      0
    );

    return NextResponse.json({
      totalBusinesses: totalBusinessesRes.count ?? 0,
      activeBusinesses: activeBusinessesRes.count ?? 0,
      todayOrders: todayOrdersRes.count ?? 0,
      todayRevenue,
      activeSubscriptions: activeSubsRes.count ?? 0,
      trialBusinesses: trialBusinessesRes.count ?? 0,
    });
  } catch (error) {
    console.error('[Platform Stats GET] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
