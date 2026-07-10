export type DashboardChartRange = 'today' | '7d' | '30d' | 'custom';

export interface SalesTrendInput {
  createdAt: string;
  amount: number;
}

export interface SalesTrendPoint {
  label: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalOrders: number;
}

export function formatTooltipCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatIsoDate(date: Date) {
  return date.toISOString();
}

function getRangeDays(start: Date, end: Date) {
  return Math.max(1, Math.ceil((endOfDay(end).getTime() - startOfDay(start).getTime() + 1) / 86_400_000));
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function formatTooltipPeriodLabel(point: SalesTrendPoint) {
  const startDate = new Date(point.startDate);
  const endDate = new Date(point.endDate);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return startDate.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) {
    return `${startDate.getDate()}-${formatShortDate(endDate)}`;
  }

  return `${formatShortDate(startDate)}-${formatShortDate(endDate)}`;
}

export function formatChartPeriodLabel(startDate: Date, endDate: Date, range: DashboardChartRange, index?: number) {
  if (range === 'today') return 'Hari Ini';
  if (range === '7d') return startDate.toLocaleDateString('id-ID', { weekday: 'short' });
  if (range === '30d' && index !== undefined) return `Minggu ${index + 1}`;

  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) return formatShortDate(startDate);

  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) {
    return `${startDate.getDate()}-${formatShortDate(endDate)}`;
  }

  return `${formatShortDate(startDate)}-${formatShortDate(endDate)}`;
}

export function getChartGroupingMode(range: DashboardChartRange, startDate?: Date, endDate?: Date) {
  if (range === 'today') return 'day';
  if (range === '7d') return 'day';
  if (range === '30d') return 'week';

  const start = startDate || new Date();
  const end = endDate || new Date();
  const days = getRangeDays(start, end);
  if (days <= 14) return 'day';
  if (days <= 90) return 'week';
  return 'month';
}

function createDayBuckets(start: Date, end: Date, range: DashboardChartRange) {
  const buckets: SalesTrendPoint[] = [];
  const cursor = startOfDay(start);
  while (cursor.getTime() <= end.getTime()) {
    const bucketStart = new Date(cursor);
    const bucketEnd = endOfDay(cursor);
    buckets.push({
      label: formatChartPeriodLabel(bucketStart, bucketEnd, range),
      startDate: formatIsoDate(bucketStart),
      endDate: formatIsoDate(bucketEnd),
      totalRevenue: 0,
      totalOrders: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

function createWeekBuckets(start: Date, end: Date, range: DashboardChartRange) {
  const buckets: SalesTrendPoint[] = [];
  const cursor = startOfDay(start);
  while (cursor.getTime() <= end.getTime()) {
    const bucketStart = new Date(cursor);
    const bucketEnd = endOfDay(new Date(cursor));
    bucketEnd.setDate(bucketEnd.getDate() + 6);
    if (bucketEnd.getTime() > end.getTime()) {
      bucketEnd.setTime(end.getTime());
    }

    buckets.push({
      label: formatChartPeriodLabel(bucketStart, bucketEnd, range, buckets.length),
      startDate: formatIsoDate(bucketStart),
      endDate: formatIsoDate(bucketEnd),
      totalRevenue: 0,
      totalOrders: 0,
    });

    cursor.setDate(cursor.getDate() + 7);
  }
  return buckets;
}

function createMonthBuckets(start: Date, end: Date) {
  const buckets: SalesTrendPoint[] = [];
  const cursor = startOfDay(start);
  cursor.setDate(1);
  while (cursor.getTime() <= end.getTime()) {
    const bucketStart = new Date(Math.max(cursor.getTime(), start.getTime()));
    const bucketEnd = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    if (bucketEnd.getTime() > end.getTime()) {
      bucketEnd.setTime(end.getTime());
    }

    buckets.push({
      label: cursor.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      startDate: formatIsoDate(bucketStart),
      endDate: formatIsoDate(bucketEnd),
      totalRevenue: 0,
      totalOrders: 0,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

export function groupSalesTrendData(
  transactions: SalesTrendInput[],
  range: DashboardChartRange,
  customStartDate?: Date,
  customEndDate?: Date
): SalesTrendPoint[] {
  const now = new Date();
  const fallbackStart = range === '7d'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    : range === '30d'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      : now;
  const start = startOfDay(customStartDate || fallbackStart);
  const end = range === 'today' ? now : endOfDay(customEndDate || now);
  const grouping = getChartGroupingMode(range, start, end);

  const buckets = grouping === 'month'
    ? createMonthBuckets(start, end)
    : grouping === 'week'
      ? createWeekBuckets(start, end, range)
      : range === 'today'
        ? [{
          label: 'Hari Ini',
          startDate: formatIsoDate(start),
          endDate: formatIsoDate(end),
          totalRevenue: 0,
          totalOrders: 0,
        }]
        : createDayBuckets(start, end, range);

  transactions.forEach((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    const bucket = buckets.find((item) => {
      return transactionTime >= new Date(item.startDate).getTime() && transactionTime <= new Date(item.endDate).getTime();
    });
    if (!bucket) return;

    bucket.totalRevenue += Number.isFinite(transaction.amount) ? transaction.amount : 0;
    bucket.totalOrders += 1;
  });

  return buckets;
}
