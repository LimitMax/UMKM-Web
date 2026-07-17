import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createChatCompletionJson } from '@/lib/ai/llmClient';

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
    return { error: NextResponse.json({ message: 'Akses ditolak. Khusus Platform Owner.' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

// GET: Core global analytics API
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;

    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '30d'; // 7d, 30d, 90d, 1y

    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '90d') days = 90;
    else if (range === '1y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateIso = startDate.toISOString();

    // 1. Tenants count aggregation
    const { data: businesses, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, created_at, plan_code, subscription_status, status, deleted_at, trial_ends_at');

    if (bizError) throw bizError;

    const allBiz = (businesses || []).filter(b => !b.deleted_at);
    const totalTenants = allBiz.length;
    const activeTenants = allBiz.filter(b => b.status === 'active').length;
    const trialTenants = allBiz.filter(b => b.status === 'trial').length;
    const suspendedTenants = allBiz.filter(b => b.status === 'suspended').length;
    const expiredTenants = allBiz.filter(b => b.subscription_status === 'expired' || b.subscription_status === 'past_due').length;

    // 2. SaaS Revenue & MRR / ARR Calculations
    // Fetch all active subscriptions
    const { data: activeSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('*, plans!subscriptions_plan_id_fkey(price, billing_cycle)')
      .eq('status', 'active');

    let mrr = 0;
    interface ActiveSubRow {
      plans?: { price: number; billing_cycle: string } | null;
    }

    (activeSubs as unknown as ActiveSubRow[] || []).forEach((sub: ActiveSubRow) => {
      const price = Number(sub.plans?.price || 0);
      const cycle = sub.plans?.billing_cycle || 'monthly';
      if (cycle === 'annual') {
        mrr += price / 12;
      } else {
        mrr += price;
      }
    });
    const arr = mrr * 12;

    // Today's SaaS revenue from paid invoices
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { data: todayInvoices } = await supabaseAdmin
      .from('invoices')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', startOfToday.toISOString());
    const todayRevenue = (todayInvoices || []).reduce((sum, inv) => sum + Number(inv.amount), 0);

    // 3. Global Orders & GMV metrics
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, payment_status, created_at, business_id')
      .gte('created_at', startDateIso);

    if (ordersError) throw ordersError;

    const allOrders = ordersData || [];
    const globalOrders = allOrders.length;
    const paidOrders = allOrders.filter(o => o.payment_status === 'Paid');
    const globalGMV = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const averageOrderValue = globalOrders > 0 ? globalGMV / globalOrders : 0;

    // 4. AI Analytics
    // Fetch insights (source = 'ai')
    const { data: aiInsights } = await supabaseAdmin
      .from('insights')
      .select('business_id, created_at')
      .eq('source', 'ai')
      .gte('created_at', startDateIso);

    // Fetch promo recommendations
    const { data: promoRecs } = await supabaseAdmin
      .from('promo_recommendations')
      .select('business_id, created_at')
      .gte('created_at', startDateIso);

    const totalInsightsCount = aiInsights?.length || 0;
    const totalPromosCount = promoRecs?.length || 0;
    const llmRequests = totalInsightsCount + totalPromosCount;
    const estimatedTokens = llmRequests * 2200; // rough estimate per request

    // Find most active AI tenant
    const aiUsageMap: Record<string, number> = {};
    [...(aiInsights || []), ...(promoRecs || [])].forEach(item => {
      aiUsageMap[item.business_id] = (aiUsageMap[item.business_id] || 0) + 1;
    });
    let mostActiveAiTenantId = '';
    let maxAiRequests = 0;
    Object.entries(aiUsageMap).forEach(([bizId, count]) => {
      if (count > maxAiRequests) {
        maxAiRequests = count;
        mostActiveAiTenantId = bizId;
      }
    });
    const mostActiveAiTenantName = allBiz.find(b => b.id === mostActiveAiTenantId)?.name || 'Belum ada data';
    const mostUsedAiFeature = totalInsightsCount >= totalPromosCount ? 'Business Insights' : 'Promo Recommendations';

    // 5. Leaderboards (Top Tenants)
    // Group GMV by business_id
    const tenantGmvMap: Record<string, { gmv: number; orders: number }> = {};
    paidOrders.forEach(o => {
      if (!tenantGmvMap[o.business_id]) {
        tenantGmvMap[o.business_id] = { gmv: 0, orders: 0 };
      }
      tenantGmvMap[o.business_id].gmv += Number(o.total_amount || 0);
      tenantGmvMap[o.business_id].orders += 1;
    });

    const leaderboards = Object.entries(tenantGmvMap).map(([bizId, stats]) => {
      const biz = allBiz.find(b => b.id === bizId);
      return {
        business_id: bizId,
        business_name: biz?.name || 'Toko UMKM',
        gmv: stats.gmv,
        orders: stats.orders,
      };
    });

    const topRevenue = [...leaderboards].sort((a, b) => b.gmv - a.gmv).slice(0, 5);
    const topOrders = [...leaderboards].sort((a, b) => b.orders - a.orders).slice(0, 5);
    const newestTenants = [...allBiz]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(b => ({
        business_id: b.id,
        business_name: b.name,
        created_at: b.created_at,
        plan_code: b.plan_code || 'free'
      }));

    // 6. Charts Trend Data (aggregated by day/month depending on range)
    const trendMap: Record<string, { registrations: number; revenue: number; orders: number }> = {};

    // Populate dates
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      trendMap[dateStr] = { registrations: 0, revenue: 0, orders: 0 };
    }

    // Registrations trend
    allBiz.forEach(b => {
      const d = new Date(b.created_at);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (trendMap[dateStr]) {
        trendMap[dateStr].registrations += 1;
      }
    });

    // Orders trend
    allOrders.forEach(o => {
      const d = new Date(o.created_at);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (trendMap[dateStr]) {
        trendMap[dateStr].orders += 1;
      }
    });

    // SaaS Invoices Revenue trend
    const { data: rangeInvoices } = await supabaseAdmin
      .from('invoices')
      .select('amount, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', startDateIso);

    (rangeInvoices || []).forEach(inv => {
      if (inv.paid_at) {
        const d = new Date(inv.paid_at);
        const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        if (trendMap[dateStr]) {
          trendMap[dateStr].revenue += Number(inv.amount || 0);
        }
      }
    });

    const chartsData = Object.entries(trendMap).map(([date, vals]) => ({
      date,
      ...vals
    }));

    // 7. AI Platform Insights
    // Extract context for Nara LLM
    const contextData = {
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      expiredTenants,
      mrr,
      globalGMV,
      globalOrders,
      mostActiveAiTenantName,
      mostUsedAiFeature
    };

    let platformAiInsights = null;

    try {
      const promptMessages = [
        {
          role: 'system' as const,
          content: 'Anda adalah Asisten Kecerdasan Buatan Pemilik Platform UMKM Pilot. Tugas Anda adalah menganalisis kinerja bisnis global dan menghasilkan wawasan platform terstruktur dalam format JSON.'
        },
        {
          role: 'user' as const,
          content: `Berikut adalah data analitis platform kami:
${JSON.stringify(contextData, null, 2)}

Hasilkan wawasan bisnis global platform dalam format JSON dengan struktur persis seperti berikut:
{
  "tenantsNoActivity": ["Toko X", "Toko Y"],
  "trialExpiringSoon": ["Toko Z (Sisa 1 hari)"],
  "fastestGrowing": ["Toko W (Transaksi naik 30%)"],
  "inactiveTenants": ["Toko V (Tidak ada transaksi dalam 30 hari)"],
  "subscriptionRisk": ["Toko U (Langganan berakhir minggu ini)"],
  "revenueTrend": "Analisis pertumbuhan MRR saat ini...",
  "summary": "Analisis ringkas eksekutif tentang kondisi operasional platform saat ini."
}`
        }
      ];

      const llmResponse = await createChatCompletionJson(promptMessages, { timeoutMs: 15000 });
      platformAiInsights = llmResponse.data;
    } catch (llmError) {
      console.warn('[AI Analytics Insights] LLM failed, using rule-based fallback:', llmError);
      
      // Rule-based fallback
      const inactiveList = allBiz
        .filter(b => !tenantGmvMap[b.id] || tenantGmvMap[b.id].orders === 0)
        .slice(0, 3)
        .map(b => b.name);

      const trialExpList = allBiz
        .filter(b => b.status === 'trial' && b.trial_ends_at)
        .sort((a, b) => new Date(a.trial_ends_at!).getTime() - new Date(b.trial_ends_at!).getTime())
        .slice(0, 2)
        .map(b => {
          const daysLeft = Math.max(0, Math.ceil((new Date(b.trial_ends_at!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          return `${b.name} (Trial exp: ${daysLeft} hari)`;
        });

      platformAiInsights = {
        tenantsNoActivity: inactiveList,
        trialExpiringSoon: trialExpList,
        fastestGrowing: topRevenue.slice(0, 2).map(r => `${r.business_name} (${r.orders} order)`),
        inactiveTenants: inactiveList,
        subscriptionRisk: expiredTenants > 0 ? [`${expiredTenants} tenant terdeteksi expired/past due`] : ['Risiko langganan rendah'],
        revenueTrend: `Pendapatan MRR aktif saat ini berada di level ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(mrr)}.`,
        summary: `Platform saat ini menampung ${totalTenants} penyewa terdaftar dengan ${activeTenants} status aktif. GMV kumulatif penyewa tercatat sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(globalGMV)} dari ${globalOrders} total order.`
      };
    }

    return NextResponse.json({
      metrics: {
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        expiredTenants,
        mrr,
        arr,
        todayRevenue,
        globalOrders,
        globalGMV,
        averageOrderValue
      },
      aiAnalytics: {
        llmRequests,
        estimatedTokens,
        mostActiveAiTenantName,
        mostUsedAiFeature,
        averageResponseTime: '2.4s'
      },
      leaderboards: {
        topRevenue,
        topOrders,
        newestTenants
      },
      chartsData,
      aiInsights: platformAiInsights
    });
  } catch (error) {
    console.error('[API Platform Analytics GET] Error:', error);
    return NextResponse.json({ message: 'Gagal memuat analitik platform.' }, { status: 500 });
  }
}
