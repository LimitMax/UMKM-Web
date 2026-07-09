import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { mapSupabaseBusinessToBusinessProfile, mapSupabaseProductToProduct } from '@/lib/data/mappers';
import { mapDbOrderToOrder } from '@/utils/statusMapper';
import { formatRupiah } from '@/utils/format';
import { Order, Product, GeneratedBusinessInsight, GeneratedPromoRecommendation } from '@/types';

export interface DateRangeInput {
  from?: string;
  to?: string;
}

interface BusinessRow {
  id: string;
  name?: string;
  business_type?: string;
  [key: string]: unknown;
}

export interface AiBusinessSummary {
  businessProfile: {
    name: string;
    type: string;
    openingHours: string;
    deliveryEnabled: boolean;
    etaEnabled: boolean;
  };
  period: {
    from: string | null;
    to: string | null;
    orderLimit: number;
    ordersAnalyzed: number;
  };
  sales: {
    paidOrders: number;
    grossRevenue: number;
    averageOrderValue: number;
    paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
    fulfillmentBreakdown: Array<{ type: string; count: number }>;
    peakHours: Array<{ hour: string; orderCount: number }>;
  };
  products: {
    activeCount: number;
    bestSelling: Array<{ name: string; quantity: number; revenue: number; price: number }>;
    lowSelling: Array<{ name: string; quantity: number; stock: number; price: number }>;
    lowStock: Array<{ name: string; stock: number; price: number }>;
  };
  delivery: {
    deliveryOrders: number;
    averageDistanceKm: number;
    averageDeliveryFee: number;
    freeDeliveryCount: number;
  };
  eta: {
    ordersWithEta: number;
    averageTotalMinutes: number;
    averageDeliveryMinutes: number;
    manuallyAdjustedCount: number;
  };
  transactions: {
    count: number;
    paidAmount: number;
  };
  riskSignals: string[];
}

export interface AiBusinessContext {
  businessId: string;
  businessName: string;
  products: Product[];
  orders: Order[];
  summary: AiBusinessSummary;
}

export async function verifyAdminRequest(request: Request, businessId: string) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { error: Response.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 }) };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return { error: Response.json({ message: 'Sesi login tidak valid.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: Response.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 403 }) };
  }

  if (profile.role !== 'admin') {
    return { error: Response.json({ message: 'Hanya admin yang dapat membuat insight bisnis.' }, { status: 403 }) };
  }

  if (profile.business_id !== businessId) {
    return { error: Response.json({ message: 'Business ID tidak sesuai dengan akun Anda.' }, { status: 403 }) };
  }

  return { supabaseAdmin, profile };
}

export async function fetchAiBusinessContext(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  businessId: string,
  dateRange?: DateRangeInput
): Promise<AiBusinessContext> {
  const { data: business, error: businessError } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    throw new Error('Profil bisnis tidak ditemukan.');
  }

  const { data: products, error: productError } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (productError) throw productError;

  let orderQuery = supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (dateRange?.from) orderQuery = orderQuery.gte('created_at', dateRange.from);
  if (dateRange?.to) orderQuery = orderQuery.lte('created_at', dateRange.to);

  const { data: orders, error: orderError } = await orderQuery;
  if (orderError) throw orderError;

  let transactionQuery = supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (dateRange?.from) transactionQuery = transactionQuery.gte('created_at', dateRange.from);
  if (dateRange?.to) transactionQuery = transactionQuery.lte('created_at', dateRange.to);

  const { data: transactions, error: transactionError } = await transactionQuery;
  if (transactionError) throw transactionError;

  const mappedProducts = (products || []).map(mapSupabaseProductToProduct);
  const mappedOrders = (orders || []).map(mapDbOrderToOrder);
  const businessProfile = mapSupabaseBusinessToBusinessProfile(business as BusinessRow);

  return {
    businessId,
    businessName: businessProfile.businessName || (business as BusinessRow).name || 'Bisnis UMKM',
    products: mappedProducts,
    orders: mappedOrders,
    summary: summarizeBusinessData({
      business: business as BusinessRow,
      products: mappedProducts,
      orders: mappedOrders,
      transactions: transactions || [],
      dateRange,
    }),
  };
}

function summarizeBusinessData({
  business,
  products,
  orders,
  transactions,
  dateRange,
}: {
  business: BusinessRow;
  products: Product[];
  orders: Order[];
  transactions: Array<Record<string, unknown>>;
  dateRange?: DateRangeInput;
}): AiBusinessSummary {
  const profile = mapSupabaseBusinessToBusinessProfile(business);
  const activeOrders = orders.filter((order) => order.status !== 'Cancelled');
  const paidOrders = activeOrders.filter((order) => order.paymentStatus === 'Paid' || order.status === 'Completed');
  const revenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  const productSales = new Map<string, { name: string; quantity: number; revenue: number; price: number }>();
  activeOrders.forEach((order) => {
    order.items.forEach((item) => {
      const current = productSales.get(item.productId) || {
        name: item.name,
        quantity: 0,
        revenue: 0,
        price: item.price,
      };
      current.quantity += item.quantity;
      current.revenue += item.price * item.quantity;
      productSales.set(item.productId, current);
    });
  });

  const hourCounts = new Map<number, number>();
  const paymentMethodCounts = new Map<string, { method: string; count: number; amount: number }>();
  const fulfillmentCounts = new Map<string, number>();
  activeOrders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    fulfillmentCounts.set(order.fulfillmentType || 'dine_in', (fulfillmentCounts.get(order.fulfillmentType || 'dine_in') || 0) + 1);
    const payment = paymentMethodCounts.get(order.paymentMethod) || { method: order.paymentMethod, count: 0, amount: 0 };
    payment.count += 1;
    payment.amount += order.totalAmount;
    paymentMethodCounts.set(order.paymentMethod, payment);
  });

  const deliveryOrders = activeOrders.filter((order) => order.fulfillmentType === 'delivery');
  const deliveryWithDistance = deliveryOrders.filter((order) => Number(order.deliveryDistanceKm || 0) > 0);
  const ordersWithEta = activeOrders.filter((order) => Number(order.estimatedTotalMinutes || 0) > 0);
  const deliveryEta = deliveryOrders.filter((order) => Number(order.estimatedDeliveryMinutes || 0) > 0);
  const paidTransactions = transactions.filter((tx) => tx.payment_status === 'paid' || tx.transaction_status === 'paid');

  return {
    businessProfile: {
      name: profile.businessName || business.name || 'Bisnis UMKM',
      type: profile.businessType || 'UMKM',
      openingHours: profile.openingHours || '-',
      deliveryEnabled: Boolean(profile.deliverySettings?.deliveryEnabled),
      etaEnabled: Boolean(profile.etaSettings?.etaEnabled),
    },
    period: {
      from: dateRange?.from || null,
      to: dateRange?.to || null,
      orderLimit: 100,
      ordersAnalyzed: orders.length,
    },
    sales: {
      paidOrders: paidOrders.length,
      grossRevenue: Math.round(revenue),
      averageOrderValue: paidOrders.length > 0 ? Math.round(revenue / paidOrders.length) : 0,
      paymentMethodBreakdown: [...paymentMethodCounts.values()]
        .map((item) => ({ ...item, amount: Math.round(item.amount) }))
        .sort((a, b) => b.count - a.count),
      fulfillmentBreakdown: [...fulfillmentCounts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      peakHours: [...hourCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour, orderCount]) => ({ hour: `${String(hour).padStart(2, '0')}.00`, orderCount })),
    },
    products: {
      activeCount: products.filter((product) => product.isActive).length,
      bestSelling: [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      lowSelling: products
        .filter((product) => product.isActive)
        .map((product) => ({
          name: product.name,
          quantity: productSales.get(product.id)?.quantity || 0,
          stock: product.stock,
          price: product.price,
        }))
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5),
      lowStock: products
        .filter((product) => product.isActive && product.stock <= 5)
        .map((product) => ({ name: product.name, stock: product.stock, price: product.price }))
        .slice(0, 5),
    },
    delivery: {
      deliveryOrders: deliveryOrders.length,
      averageDistanceKm: average(deliveryWithDistance.map((order) => Number(order.deliveryDistanceKm || 0))),
      averageDeliveryFee: Math.round(average(deliveryOrders.map((order) => Number(order.deliveryFeeAmount || 0)))),
      freeDeliveryCount: deliveryOrders.filter((order) => order.freeDeliveryApplied).length,
    },
    eta: {
      ordersWithEta: ordersWithEta.length,
      averageTotalMinutes: Math.round(average(ordersWithEta.map((order) => Number(order.estimatedTotalMinutes || 0)))),
      averageDeliveryMinutes: Math.round(average(deliveryEta.map((order) => Number(order.estimatedDeliveryMinutes || 0)))),
      manuallyAdjustedCount: ordersWithEta.filter((order) => order.etaManuallyAdjusted).length,
    },
    transactions: {
      count: transactions.length,
      paidAmount: Math.round(paidTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)),
    },
    riskSignals: [
      ...(products.filter((product) => product.isActive && product.stock <= 5).length > 0
        ? ['Ada produk stok rendah <= 5 unit.']
        : []),
      ...(paidOrders.length === 0 ? ['Belum ada pesanan lunas pada periode ini.'] : []),
      ...(ordersWithEta.length > 0 && average(ordersWithEta.map((order) => Number(order.estimatedTotalMinutes || 0))) > 35
        ? ['Rata-rata ETA di atas 35 menit.']
        : []),
      ...(deliveryOrders.filter((order) => order.freeDeliveryApplied).length > 0 ? ['Gratis ongkir digunakan pada beberapa pesanan.'] : []),
    ].slice(0, 5),
  };
}

function average(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function formatHourRange(hourLabel: string): string {
  const hour = Number(hourLabel.slice(0, 2));
  if (!Number.isFinite(hour)) return 'Jam operasional toko';
  return `${String(hour).padStart(2, '0')}.00 - ${String((hour + 2) % 24).padStart(2, '0')}.00`;
}

export function buildRuleBasedBusinessInsight(context: AiBusinessContext): GeneratedBusinessInsight {
  const { summary } = context;
  const bestSeller = summary.products.bestSelling[0];
  const slowSeller = summary.products.lowSelling[0];
  const peakHour = summary.sales.peakHours[0];
  const lowStockNames = summary.products.lowStock.map((item) => `${item.name} (${item.stock})`);

  return {
    executiveSummary:
      summary.period.ordersAnalyzed === 0
        ? 'Insight rule-based digunakan. Belum ada pesanan terbaru untuk dianalisis, jadi rekomendasi fokus pada kesiapan produk dan pengumpulan data transaksi.'
        : `Insight rule-based digunakan. ${context.businessName} mencatat ${summary.sales.paidOrders} pesanan lunas dengan omzet ${formatRupiah(summary.sales.grossRevenue)} dan AOV ${formatRupiah(summary.sales.averageOrderValue)}.`,
    salesHighlights: bestSeller
      ? [`Produk terlaris saat ini adalah ${bestSeller.name} dengan ${bestSeller.quantity} unit terjual.`, `Jam transaksi tertinggi: ${peakHour ? formatHourRange(peakHour.hour) : 'belum cukup data'}.`]
      : ['Belum ada produk terjual pada periode ini.'],
    riskAlerts: [
      ...(lowStockNames.length > 0 ? [`Stok rendah: ${lowStockNames.join(', ')}.`] : ['Tidak ada stok kritis terdeteksi dari ambang <= 5 unit.']),
      ...(summary.sales.paidOrders === 0 ? ['Belum ada pesanan lunas pada periode ini.'] : []),
    ],
    productInsights: [
      bestSeller ? `${bestSeller.name} layak dijaga ketersediaannya karena menjadi kontributor permintaan utama.` : 'Data produk terlaris belum cukup.',
      slowSeller ? `${slowSeller.name} bisa diuji dalam bundling karena penjualannya masih rendah.` : 'Produk slow-moving belum teridentifikasi.',
    ],
    stockRecommendations:
      summary.products.lowStock.length > 0
        ? summary.products.lowStock.map((item) => `Restock ${item.name}; stok tersisa ${item.stock} unit.`)
        : ['Pertahankan monitoring stok harian, terutama sebelum jam ramai.'],
    deliveryInsights:
      summary.delivery.deliveryOrders > 0
        ? [`Ada ${summary.delivery.deliveryOrders} pesanan delivery dengan rata-rata ongkir ${formatRupiah(summary.delivery.averageDeliveryFee)}.`]
        : ['Delivery belum dominan pada periode ini.'],
    etaInsights:
      summary.eta.ordersWithEta > 0
        ? [`Rata-rata ETA total ${summary.eta.averageTotalMinutes} menit; ${summary.eta.manuallyAdjustedCount} pesanan disesuaikan manual.`]
        : ['Belum ada data ETA yang cukup untuk dianalisis.'],
    actionPlan: [
      {
        priority: 'high',
        action: bestSeller ? `Amankan bahan baku untuk ${bestSeller.name} sebelum jam ramai.` : 'Dorong transaksi awal agar data produk mulai terbaca.',
      },
      {
        priority: 'medium',
        action: slowSeller && bestSeller ? `Uji bundling ${bestSeller.name} + ${slowSeller.name} selama 3 hari.` : 'Buat promo sederhana untuk produk dengan stok aman.',
      },
      {
        priority: 'low',
        action: peakHour ? `Siapkan operasional 30 menit sebelum ${formatHourRange(peakHour.hour)}.` : 'Catat jam transaksi untuk menemukan pola ramai.',
      },
    ],
    generatedAt: new Date().toISOString(),
    source: 'rule_based',
  };
}

export function buildRuleBasedPromoRecommendation(context: AiBusinessContext): GeneratedPromoRecommendation {
  const bestSeller = context.summary.products.bestSelling[0];
  const slowSeller = context.summary.products.lowSelling[0];
  const main = context.products.find((product) => product.name === bestSeller?.name) || context.products[0];
  const bundle = context.products.find((product) => product.name === slowSeller?.name && product.id !== main?.id) || context.products.find((product) => product.id !== main?.id);
  const normalPrice = Math.max(0, (main?.price || 18000) + (bundle?.price || 0));
  const savings = Math.round(normalPrice * 0.12);
  const suggestedPrice = Math.max(0, normalPrice - savings);
  const peakHour = context.summary.sales.peakHours[0];
  const targetTime = peakHour ? formatHourRange(peakHour.hour) : '12.00 - 14.00';
  const mainName = main?.name || 'Menu Favorit';
  const bundleName = bundle?.name || 'Tidak Ada';

  return {
    title: 'Paket Hemat Terukur',
    suggestedPromoName: `Kombo ${mainName.slice(0, 18)}${bundle ? ` + ${bundleName.slice(0, 18)}` : ''}`,
    campaignGoal: 'Menaikkan nilai keranjang rata-rata dan membantu perputaran produk lambat.',
    mainProductName: mainName,
    bundleProductName: bundleName,
    reason: `Rekomendasi rule-based dibuat dari sinyal produk terlaris, produk slow-moving, stok, dan jam transaksi tertinggi.`,
    normalPrice,
    suggestedPrice,
    estimatedSavings: savings,
    targetTime,
    targetCustomer: 'Pelanggan reguler, pembeli kombo hemat, dan pelanggan saat jam ramai',
    confidenceScore: context.summary.period.ordersAnalyzed > 0 ? 78 : 60,
    basedOnSignals: [
      bestSeller ? `Best seller: ${bestSeller.name} (${bestSeller.quantity} unit)` : 'Data best seller belum cukup',
      slowSeller ? `Slow-moving: ${slowSeller.name} (${slowSeller.quantity} unit)` : 'Data slow-moving belum cukup',
      peakHour ? `Jam ramai: ${targetTime}` : 'Jam ramai belum stabil',
    ],
    whatsappCaption: `*${mainName} makin hemat!*\n\nCoba ${mainName}${bundle ? ` + ${bundleName}` : ''} hanya ${formatRupiah(suggestedPrice)}. Hemat ${formatRupiah(savings)} khusus ${targetTime}. Pesan langsung dari QR menu toko ya.`,
    instagramCaption: `PROMO KOMBO HEMAT\n\n${mainName}${bundle ? ` + ${bundleName}` : ''} sekarang hanya ${formatRupiah(suggestedPrice)}. Cocok buat jam ${targetTime}. Yuk mampir dan pesan lewat QR menu!\n#UMKMPilot #PromoUMKM #KulinerLokal`,
    shortCaption: `${mainName}${bundle ? ` + ${bundleName}` : ''} hemat ${formatRupiah(savings)}!`,
    checklist: [
      'Pastikan stok produk promo aman sebelum kampanye dimulai.',
      'Pasang caption di WhatsApp Status dan Instagram Story.',
      'Evaluasi jumlah transaksi dan AOV setelah 3 hari.',
    ],
    generatedAt: new Date().toISOString(),
    source: 'rule_based',
  };
}

export async function saveBusinessInsight(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  businessId: string,
  insight: GeneratedBusinessInsight
) {
  const { error } = await supabaseAdmin.from('insights').insert([
    {
      id: `insight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      business_id: businessId,
      type: 'business_insight',
      title: 'AI Business Insight',
      description: insight.executiveSummary,
      source: insight.source,
      metadata: insight,
      created_at: insight.generatedAt,
    },
  ]);
  if (error) console.warn('Failed to save business insight:', error.message);
}

export async function savePromoRecommendation(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  businessId: string,
  context: AiBusinessContext,
  promo: GeneratedPromoRecommendation
) {
  const mainProduct = context.products.find((product) => product.name === promo.mainProductName) || context.products[0];
  const bundleProduct = context.products.find((product) => product.name === promo.bundleProductName && product.id !== mainProduct?.id);
  if (!mainProduct) return;

  const { error } = await supabaseAdmin.from('promo_recommendations').insert([
    {
      id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      business_id: businessId,
      title: promo.title,
      reason: promo.reason,
      main_product_id: mainProduct.id,
      bundle_product_id: bundleProduct?.id || null,
      suggested_promo_name: promo.suggestedPromoName,
      normal_price: promo.normalPrice,
      suggested_price: promo.suggestedPrice,
      estimated_savings: promo.estimatedSavings,
      target_time: promo.targetTime,
      target_customer: promo.targetCustomer,
      campaign_goal: promo.campaignGoal,
      whatsapp_caption: promo.whatsappCaption,
      instagram_caption: promo.instagramCaption,
      short_caption: promo.shortCaption,
      confidence_score: promo.confidenceScore,
      based_on_signals: promo.basedOnSignals,
      created_at: promo.generatedAt,
    },
  ]);
  if (error) console.warn('Failed to save promo recommendation:', error.message);
}
