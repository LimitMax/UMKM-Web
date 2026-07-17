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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/platform/businesses/[id]
export async function GET(request: Request, context: RouteContext) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: 'Business ID tidak ditemukan.' }, { status: 400 });
    }

    // Fetch business detail (exclude sensitive Midtrans keys)
    const { data: business, error: bizError } = await supabaseAdmin!
      .from('businesses')
      .select(`
        id,
        name,
        business_type,
        slug,
        plan_code,
        subscription_status,
        trial_ends_at,
        description,
        address,
        whatsapp_number,
        opening_hours,
        currency,
        tax_enabled,
        tax_percentage,
        service_charge_enabled,
        service_charge_percentage,
        public_order_enabled,
        created_at,
        updated_at,
        status,
        suspended_reason,
        suspended_at,
        suspended_by,
        deleted_at,
        deleted_by
      `)
      .eq('id', id)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ message: 'Bisnis tidak ditemukan.' }, { status: 404 });
    }

    // Fetch owner profiles for this business
    const { data: profiles } = await supabaseAdmin!
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('business_id', id)
      .in('role', ['admin', 'cashier'])
      .order('role', { ascending: true });

    // Fetch subscription history
    const { data: subscriptions } = await supabaseAdmin!
      .from('business_subscriptions')
      .select(`
        id,
        plan_id,
        status,
        billing_cycle,
        started_at,
        trial_ends_at,
        current_period_start,
        current_period_end,
        created_at
      `)
      .eq('business_id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Products summary
    const { count: productCount } = await supabaseAdmin!
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', id);

    const { data: categoriesData } = await supabaseAdmin!
      .from('products')
      .select('category')
      .eq('business_id', id);

    const distinctCategories = Array.from(
      new Set((categoriesData as unknown as Array<{ category: string | null }> || []).map((p) => p.category).filter(Boolean))
    );

    // Orders and Revenue breakdown
    const { data: orderStatuses } = await supabaseAdmin!
      .from('orders')
      .select('status, payment_status, total_amount')
      .eq('business_id', id);

    const statusBreakdown: Record<string, number> = {};
    let totalRevenue = 0;
    (orderStatuses as unknown as Array<{ status: string; payment_status: string; total_amount: number | string }> || []).forEach((o) => {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
      if (o.payment_status === 'Paid') {
        totalRevenue += Number(o.total_amount) || 0;
      }
    });

    // AI Insights Summary
    const { count: insightCount } = await supabaseAdmin!
      .from('insights')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', id);

    const { count: promoCount } = await supabaseAdmin!
      .from('promo_recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', id);

    // Recent activity (latest 5 orders)
    const { data: recentOrders } = await supabaseAdmin!
      .from('orders')
      .select('id, customer_name, total_amount, status, payment_status, created_at')
      .eq('business_id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      business: {
        ...business,
        status: business.status ?? 'active',
      },
      profiles: profiles || [],
      subscriptions: subscriptions || [],
      productsSummary: {
        totalProducts: productCount ?? 0,
        categories: distinctCategories,
      },
      orderSummary: {
        totalOrders: (orderStatuses || []).length,
        totalRevenue,
        statusBreakdown,
      },
      aiSummary: {
        totalInsights: insightCount ?? 0,
        totalPromos: promoCount ?? 0,
      },
      recentActivity: recentOrders || [],
    });
  } catch (error) {
    console.error('[Platform Business Detail GET] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
