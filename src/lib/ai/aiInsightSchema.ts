import { GeneratedBusinessInsight, GeneratedPromoRecommendation } from '@/types';

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean).slice(0, 8)
    : [];

const clampScore = (value: unknown): number => Math.max(0, Math.min(100, Math.round(asNumber(value, 70))));

const asActionPlan = (value: unknown): GeneratedBusinessInsight['actionPlan'] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { priority: 'medium' as const, action: asString(item) };
      }

      if (!item || typeof item !== 'object') return null;
      const data = item as Record<string, unknown>;
      const rawPriority = asString(data.priority, 'medium').toLowerCase();
      const priority = rawPriority === 'high' || rawPriority === 'low' ? rawPriority : 'medium';
      const action = asString(data.action);
      return action ? { priority, action } : null;
    })
    .filter((item): item is GeneratedBusinessInsight['actionPlan'][number] => Boolean(item))
    .slice(0, 3);
};

export function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const match = withoutFence.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM response did not contain JSON.');
    return JSON.parse(match[0]);
  }
}

export function validateBusinessInsightOutput(value: unknown): Omit<GeneratedBusinessInsight, 'generatedAt' | 'source'> | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const executiveSummary = asString(data.executiveSummary);
  const actionPlan = asActionPlan(data.actionPlan);

  if (!executiveSummary || actionPlan.length === 0) return null;

  return {
    executiveSummary,
    salesHighlights: asStringArray(data.salesHighlights).slice(0, 3),
    riskAlerts: asStringArray(data.riskAlerts).slice(0, 3),
    productInsights: asStringArray(data.productInsights).slice(0, 3),
    stockRecommendations: asStringArray(data.stockRecommendations).slice(0, 3),
    deliveryInsights: asStringArray(data.deliveryInsights).slice(0, 3),
    etaInsights: asStringArray(data.etaInsights).slice(0, 3),
    actionPlan,
  };
}

export function validatePromoOutput(value: unknown): Omit<GeneratedPromoRecommendation, 'generatedAt' | 'source'> | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const title = asString(data.title);
  const suggestedPromoName = asString(data.suggestedPromoName);
  const reason = asString(data.reason);
  const suggestedPrice = asNumber(data.suggestedPrice);

  if (!title || !suggestedPromoName || !reason || suggestedPrice <= 0) return null;

  return {
    title,
    suggestedPromoName,
    campaignGoal: asString(data.campaignGoal, 'Meningkatkan omzet dan nilai keranjang rata-rata.'),
    mainProductName: asString(data.mainProductName, 'Produk utama'),
    bundleProductName: asString(data.bundleProductName, 'Tidak Ada'),
    reason,
    normalPrice: asNumber(data.normalPrice, suggestedPrice),
    suggestedPrice,
    estimatedSavings: Math.max(0, asNumber(data.estimatedSavings)),
    targetTime: asString(data.targetTime, 'Jam operasional toko'),
    targetCustomer: asString(data.targetCustomer, 'Pelanggan reguler dan pembeli baru'),
    confidenceScore: clampScore(data.confidenceScore),
    basedOnSignals: asStringArray(data.basedOnSignals).slice(0, 3),
    whatsappCaption: asString(data.whatsappCaption, title),
    instagramCaption: asString(data.instagramCaption, title),
    shortCaption: asString(data.shortCaption, title),
    checklist: asStringArray(data.checklist).slice(0, 3),
  };
}
