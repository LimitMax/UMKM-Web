import { AiBusinessContext } from './serverData';

function contextBlock(context: AiBusinessContext): string {
  const summary = context.summary;
  return JSON.stringify({
    business: {
      name: summary.businessProfile.name,
      type: summary.businessProfile.type,
    },
    period: summary.period,
    sales: {
      revenue: summary.sales.grossRevenue,
      totalOrders: summary.period.ordersAnalyzed,
      paidOrders: summary.sales.paidOrders,
      averageOrderValue: summary.sales.averageOrderValue,
      paymentMethodBreakdown: summary.sales.paymentMethodBreakdown,
      fulfillmentBreakdown: summary.sales.fulfillmentBreakdown,
      peakHours: summary.sales.peakHours,
    },
    products: {
      topProducts: summary.products.bestSelling.slice(0, 5),
      lowStockProducts: summary.products.lowStock.slice(0, 5),
      lowSellingProducts: summary.products.lowSelling.slice(0, 5),
    },
    delivery: summary.delivery,
    eta: summary.eta,
    recentRiskSignals: summary.riskSignals,
  });
}

export function buildBusinessInsightPrompt(context: AiBusinessContext, insightType?: string) {
  return [
    {
      role: 'system' as const,
      content:
        'Anda adalah konsultan bisnis UMKM di Indonesia. Return valid JSON only. Tanpa markdown, tanpa teks tambahan. Bahasa Indonesia ringkas dan berbasis data.',
    },
    {
      role: 'user' as const,
      content: `Buat business insights untuk ${context.businessName}. Jenis insight: ${insightType || 'general'}.

Data ringkas bisnis:
${contextBlock(context)}

Kembalikan JSON ringkas dengan shape persis:
{
  "executiveSummary": "maksimal 2 kalimat",
  "salesHighlights": ["maks 3 item"],
  "riskAlerts": ["maks 3 item"],
  "productInsights": ["maks 3 item"],
  "stockRecommendations": ["maks 3 item"],
  "deliveryInsights": ["maks 3 item"],
  "etaInsights": ["maks 3 item"],
  "actionPlan": [
    {"priority": "high", "action": "..."},
    {"priority": "medium", "action": "..."}
  ]
}

Aturan:
- Jangan mengarang angka yang tidak ada di data.
- Fokus pada rekomendasi yang bisa dilakukan pemilik bisnis kecil.
- Jika data minim, sebutkan keterbatasan data dan beri aksi pengumpulan data.
- Maksimal 3 item per array.
- actionPlan maksimal 3 item dengan priority: high, medium, atau low.`,
    },
  ];
}

export function buildPromoPrompt(context: AiBusinessContext) {
  return [
    {
      role: 'system' as const,
      content:
        'Anda adalah growth marketer untuk UMKM kuliner Indonesia. Return valid JSON only. Tanpa markdown, tanpa teks tambahan.',
    },
    {
      role: 'user' as const,
      content: `Buat 1 rekomendasi kampanye promo paling actionable untuk ${context.businessName}.

Data ringkas bisnis:
${contextBlock(context)}

Kembalikan JSON ringkas dengan shape persis:
{
  "title": "judul pendek",
  "suggestedPromoName": "nama promo",
  "campaignGoal": "tujuan kampanye",
  "mainProductName": "produk utama",
  "bundleProductName": "produk bundle atau Tidak Ada",
  "reason": "alasan berbasis data",
  "normalPrice": 0,
  "suggestedPrice": 0,
  "estimatedSavings": 0,
  "targetTime": "waktu terbaik",
  "targetCustomer": "segmen pelanggan",
  "confidenceScore": 0,
  "basedOnSignals": ["maks 3 sinyal"],
  "whatsappCaption": "caption siap kirim, maks 450 karakter",
  "instagramCaption": "caption siap posting, maks 500 karakter",
  "shortCaption": "caption pendek",
  "checklist": ["maks 3 item"]
}

Aturan:
- Gunakan harga produk asli dari data.
- Diskon harus realistis untuk UMKM, biasanya 8-18%.
- Jangan membuat promo payment gateway atau Maps API.
- Caption harus berbahasa Indonesia dan siap pakai.
- Confidence score 0-100 berdasarkan kekuatan data.`,
    },
  ];
}
