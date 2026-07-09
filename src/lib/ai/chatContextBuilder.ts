import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AiBusinessContext, DateRangeInput, fetchAiBusinessContext } from './serverData';
import { AiDateRangeKey, buildAiDateRange } from './dateRange';

export type ChatDateRangeKey = AiDateRangeKey;

export interface ChatBusinessContext {
  businessName: string;
  businessType: string;
  dateRange: {
    key: ChatDateRangeKey;
    from: string;
    to: string;
  };
  sales: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    paidOrderCount: number;
    unpaidOrderCount: number;
    paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
    fulfillmentBreakdown: Array<{ type: string; count: number }>;
    peakHours: Array<{ hour: string; orderCount: number }>;
  };
  products: {
    bestSellingTop5: Array<{ name: string; quantity: number; revenue: number; price: number }>;
    lowSellingTop5: Array<{ name: string; quantity: number; stock: number; price: number }>;
    lowStockTop5: Array<{ name: string; stock: number; price: number }>;
  };
  delivery: {
    deliveryOrderCount: number;
    averageDeliveryFee: number;
    averageDistanceKm: number;
    freeDeliveryCount: number;
  };
  eta: {
    averageEtaMinutes: number;
    averageDeliveryMinutes: number;
    manuallyAdjustedEtaCount: number;
  };
  recentRisks: string[];
  latestBusinessInsight?: {
    title: string;
    source: string;
    description: string;
  };
  latestPromoRecommendation?: {
    title: string;
    reason: string | null;
    suggestedPromoName: string;
  };
}

export function buildDateRangeFromKey(key: ChatDateRangeKey): DateRangeInput & { from: string; to: string } {
  return buildAiDateRange(key);
}

export async function buildChatBusinessContext(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  businessId: string,
  rangeKey: ChatDateRangeKey
): Promise<ChatBusinessContext> {
  const dateRange = buildDateRangeFromKey(rangeKey);
  const context = await fetchAiBusinessContext(supabaseAdmin, businessId, dateRange);
  const [latestInsight, latestPromo] = await Promise.all([
    fetchLatestInsight(supabaseAdmin, businessId),
    fetchLatestPromo(supabaseAdmin, businessId),
  ]);

  return mapAiContextToChatContext(context, rangeKey, dateRange, latestInsight, latestPromo);
}

function mapAiContextToChatContext(
  context: AiBusinessContext,
  rangeKey: ChatDateRangeKey,
  dateRange: { from: string; to: string },
  latestInsight?: ChatBusinessContext['latestBusinessInsight'],
  latestPromo?: ChatBusinessContext['latestPromoRecommendation']
): ChatBusinessContext {
  const unpaidOrderCount = context.orders.filter((order) => order.paymentStatus !== 'Paid' && order.status !== 'Completed' && order.status !== 'Cancelled').length;
  const noSalesProducts = context.summary.products.lowSelling.filter((product) => product.quantity === 0).slice(0, 3);
  const longEtaRisk = context.summary.eta.averageTotalMinutes > 35 ? [`ETA rata-rata ${context.summary.eta.averageTotalMinutes} menit, perlu evaluasi kapasitas.`] : [];
  const highDeliveryFeeRisk = context.summary.delivery.averageDeliveryFee > 15000 ? [`Ongkir rata-rata ${context.summary.delivery.averageDeliveryFee}, cek dampak ke konversi delivery.`] : [];

  return {
    businessName: context.businessName,
    businessType: context.summary.businessProfile.type,
    dateRange: {
      key: rangeKey,
      from: dateRange.from,
      to: dateRange.to,
    },
    sales: {
      totalRevenue: context.summary.sales.grossRevenue,
      totalOrders: context.summary.period.ordersAnalyzed,
      averageOrderValue: context.summary.sales.averageOrderValue,
      paidOrderCount: context.summary.sales.paidOrders,
      unpaidOrderCount,
      paymentMethodBreakdown: context.summary.sales.paymentMethodBreakdown,
      fulfillmentBreakdown: context.summary.sales.fulfillmentBreakdown,
      peakHours: context.summary.sales.peakHours,
    },
    products: {
      bestSellingTop5: context.summary.products.bestSelling.slice(0, 5),
      lowSellingTop5: context.summary.products.lowSelling.slice(0, 5),
      lowStockTop5: context.summary.products.lowStock.slice(0, 5),
    },
    delivery: {
      deliveryOrderCount: context.summary.delivery.deliveryOrders,
      averageDeliveryFee: context.summary.delivery.averageDeliveryFee,
      averageDistanceKm: context.summary.delivery.averageDistanceKm,
      freeDeliveryCount: context.summary.delivery.freeDeliveryCount,
    },
    eta: {
      averageEtaMinutes: context.summary.eta.averageTotalMinutes,
      averageDeliveryMinutes: context.summary.eta.averageDeliveryMinutes,
      manuallyAdjustedEtaCount: context.summary.eta.manuallyAdjustedCount,
    },
    recentRisks: [
      ...context.summary.riskSignals,
      ...(unpaidOrderCount >= 5 ? [`Ada ${unpaidOrderCount} order belum lunas/selesai.`] : []),
      ...noSalesProducts.map((product) => `${product.name} belum terjual pada rentang ini.`),
      ...longEtaRisk,
      ...highDeliveryFeeRisk,
    ].slice(0, 8),
    latestBusinessInsight: latestInsight,
    latestPromoRecommendation: latestPromo,
  };
}

async function fetchLatestInsight(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  businessId: string
): Promise<ChatBusinessContext['latestBusinessInsight'] | undefined> {
  const { data, error } = await supabaseAdmin
    .from('insights')
    .select('title, source, description')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;
  return {
    title: data.title || 'Insight terakhir',
    source: data.source || 'unknown',
    description: data.description || '',
  };
}

async function fetchLatestPromo(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  businessId: string
): Promise<ChatBusinessContext['latestPromoRecommendation'] | undefined> {
  const { data, error } = await supabaseAdmin
    .from('promo_recommendations')
    .select('title, reason, suggested_promo_name')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;
  return {
    title: data.title || 'Promo terakhir',
    reason: data.reason || null,
    suggestedPromoName: data.suggested_promo_name || data.title || 'Promo rekomendasi',
  };
}
