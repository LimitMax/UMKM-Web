'use client';

import { useMemo, useState } from 'react';
import {
  DashboardChartRange,
  SalesTrendInput,
  SalesTrendPoint,
  formatTooltipCurrency,
  formatTooltipPeriodLabel,
  groupSalesTrendData,
} from '../../lib/dashboard/chartUtils';

export type SalesTrendRange = DashboardChartRange;
export type SalesTrendEvent = SalesTrendInput;

interface SalesTrendDateRange {
  start: Date;
  end: Date;
}

interface SalesTrendChartProps {
  data: SalesTrendEvent[];
  range: SalesTrendRange;
  dateRange: SalesTrendDateRange;
  isLoading: boolean;
  emptyState?: {
    title: string;
    description: string;
  };
  showSparseDataNote?: boolean;
  highlightToday?: boolean;
}

function getTooltipPosition(index: number, total: number) {
  if (total <= 1) return 'left-1/2 -translate-x-1/2';
  if (index === 0) return 'left-0';
  if (index === total - 1) return 'right-0';
  return 'left-1/2 -translate-x-1/2';
}

function ChartTooltip({ point }: { point: SalesTrendPoint }) {
  return (
    <div className="min-w-40 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-left shadow-2xl shadow-black/30">
      <div className="text-[10px] font-black text-white">{formatTooltipPeriodLabel(point)}</div>
      <div className="mt-1 space-y-0.5 text-[10px] font-semibold text-slate-400">
        <p>Pendapatan: <span className="text-emerald-400">{formatTooltipCurrency(point.totalRevenue)}</span></p>
        <p>Pesanan lunas: <span className="text-slate-200">{point.totalOrders}</span></p>
      </div>
    </div>
  );
}

export default function SalesTrendChart({
  data,
  range,
  dateRange,
  isLoading,
  emptyState = {
    title: 'Belum ada data penjualan',
    description: 'Grafik akan muncul setelah transaksi pertama berhasil dibayar pada periode ini.',
  },
  showSparseDataNote = true,
  highlightToday = false,
}: SalesTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const groupedData = useMemo(
    () => groupSalesTrendData(data, range, dateRange.start, dateRange.end),
    [data, dateRange.end, dateRange.start, range]
  );
  const maxRevenue = Math.max(...groupedData.map((point) => point.totalRevenue), 0);
  const hasData = groupedData.some((point) => point.totalRevenue > 0);
  const activeBuckets = groupedData.filter((point) => point.totalRevenue > 0).length;
  const chartWidthClass = groupedData.length <= 2 ? 'max-w-md mx-auto' : 'w-full';

  if (isLoading) {
    return (
      <div className="h-56 rounded-2xl bg-slate-950/40 border border-slate-850 p-5 animate-pulse">
        <div className="flex h-full items-end justify-center gap-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="w-full max-w-10 rounded-t-lg bg-slate-850" style={{ height: `${30 + index * 6}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 px-6">
        <h4 className="text-sm font-black text-white mb-1">{emptyState.title}</h4>
        <p className="text-xs text-slate-500 max-w-sm">{emptyState.description}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSparseDataNote && activeBuckets <= 2 && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[10px] font-semibold text-amber-300">
          Data masih terbatas pada periode ini.
        </div>
      )}

      <div className="relative h-60 rounded-2xl border border-slate-850 bg-slate-950/30 px-4 pb-10 pt-8">
        <div className="absolute inset-x-4 top-8 bottom-10 flex flex-col justify-between pointer-events-none">
          <span className="h-px bg-slate-850/45" />
          <span className="h-px bg-slate-850/35" />
          <span className="h-px bg-slate-850/25" />
        </div>

        <div
          className={`relative z-10 grid h-full items-end gap-3 sm:gap-4 ${chartWidthClass}`}
          style={{ gridTemplateColumns: `repeat(${groupedData.length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {groupedData.map((point, index) => {
            const isToday = new Date(point.startDate).toDateString() === new Date().toDateString();
            const useAccentBar = !highlightToday || isToday;
            const heightPercent = maxRevenue > 0
              ? Math.max((point.totalRevenue / maxRevenue) * 100, point.totalRevenue > 0 ? 9 : isToday && highlightToday ? 3 : 0)
              : 0;
            const tooltipPosition = getTooltipPosition(index, groupedData.length);

            return (
              <div
                key={`${point.startDate}-${point.endDate}`}
                className="relative flex h-full min-w-0 flex-col items-center justify-end"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onTouchStart={() => setActiveIndex(index)}
              >
                {activeIndex === index && (
                  <div className={`absolute bottom-[calc(100%+0.75rem)] z-30 ${tooltipPosition}`}>
                    <ChartTooltip point={point} />
                  </div>
                )}

                <button
                  type="button"
                  aria-label={`${point.label}, pendapatan ${formatTooltipCurrency(point.totalRevenue)}`}
                  className="flex h-full w-full cursor-pointer items-end justify-center border-none bg-transparent p-0"
                >
                  <span
                    style={{ height: `${heightPercent}%` }}
                    className={`block w-full max-w-12 rounded-t-lg transition-all duration-300 ${
                      point.totalRevenue > 0 && useAccentBar
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md shadow-emerald-500/10 hover:from-emerald-500 hover:to-emerald-300'
                        : point.totalRevenue > 0
                          ? 'bg-slate-700 hover:bg-slate-600'
                          : isToday && highlightToday
                            ? 'bg-emerald-500/60'
                            : 'bg-slate-850/70'
                    }`}
                  />
                </button>

                <span className="absolute top-full mt-3 max-w-16 truncate text-center text-[9px] font-semibold text-slate-500 sm:text-[10px]">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
