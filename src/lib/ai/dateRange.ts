export type AiDateRangeKey = 'today' | '7d' | '30d';

export interface AiDateRange {
  key: AiDateRangeKey;
  label: string;
  from: string;
  to: string;
}

export const AI_DATE_RANGE_LABELS: Record<AiDateRangeKey, string> = {
  today: 'Hari Ini',
  '7d': '7 Hari Terakhir',
  '30d': '30 Hari Terakhir',
};

export function isAiDateRangeKey(value: unknown): value is AiDateRangeKey {
  return value === 'today' || value === '7d' || value === '30d';
}

export function buildAiDateRange(key: AiDateRangeKey = '7d'): AiDateRange {
  const now = new Date();
  const from = new Date(now);

  if (key === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (key === '7d') {
    from.setDate(now.getDate() - 7);
  } else {
    from.setDate(now.getDate() - 30);
  }

  return {
    key,
    label: AI_DATE_RANGE_LABELS[key],
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

export function normalizeAiDateRange(value: unknown): AiDateRange {
  if (isAiDateRangeKey(value)) return buildAiDateRange(value);

  if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>;
    const key = isAiDateRangeKey(data.key) ? data.key : '7d';
    const fallback = buildAiDateRange(key);
    return {
      key,
      label: AI_DATE_RANGE_LABELS[key],
      from: typeof data.from === 'string' ? data.from : fallback.from,
      to: typeof data.to === 'string' ? data.to : fallback.to,
    };
  }

  return buildAiDateRange('7d');
}
