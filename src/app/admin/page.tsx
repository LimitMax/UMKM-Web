'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  DollarSign,
  Minus,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Product, Order } from '../../types';
import { formatPaymentMethod, formatRupiah, formatDate } from '../../utils/format';
import { mapDbOrderToOrder } from '../../utils/statusMapper';
import { realtimeService } from '../../lib/services/realtimeService';
import { useAuth } from '../../components/AuthProvider';
import { supabaseClient } from '../../lib/supabase/client';
import SalesTrendChart, { SalesTrendEvent } from '../../components/dashboard/SalesTrendChart';

type RangeMode = 'today' | '7d' | '30d' | 'custom';

interface TransactionRow {
  id: string;
  business_id: string;
  order_id: string | null;
  amount: number | string;
  payment_method: string;
  payment_status: string;
  transaction_status: string;
  created_at: string;
}

interface PeriodRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

interface GrowthResult {
  text: string;
  tone: 'positive' | 'negative' | 'neutral';
}

const rangeOptions: Array<{ id: RangeMode; label: string }> = [
  { id: 'today', label: 'Hari Ini' },
  { id: '7d', label: '7 Hari' },
  { id: '30d', label: '30 Hari' },
  { id: 'custom', label: 'Custom' },
];

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRange(mode: RangeMode, customStart: string, customEnd: string): PeriodRange {
  const now = new Date();
  let start = startOfLocalDay(now);
  let end = now;

  if (mode === '7d' || mode === '30d') {
    const days = mode === '7d' ? 7 : 30;
    start = startOfLocalDay(now);
    start.setDate(start.getDate() - (days - 1));
  }

  if (mode === 'custom') {
    const parsedStart = customStart ? new Date(`${customStart}T00:00:00`) : now;
    const parsedEnd = customEnd ? new Date(`${customEnd}T23:59:59.999`) : now;
    start = startOfLocalDay(parsedStart);
    end = endOfLocalDay(parsedEnd);
    if (start.getTime() > end.getTime()) {
      [start, end] = [startOfLocalDay(parsedEnd), endOfLocalDay(parsedStart)];
    }
  }

  const durationMs = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs + 1);

  return { start, end, previousStart, previousEnd };
}

function isWithin(dateStr: string, start: Date, end: Date) {
  const time = new Date(dateStr).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function isPaidOrder(order: Order) {
  return order.status !== 'Cancelled' && (order.paymentStatus === 'Paid' || order.status === 'Completed');
}

function isSuccessfulTransaction(tx: TransactionRow) {
  return tx.payment_status === 'paid' || tx.transaction_status === 'paid';
}

function calculateGrowth(current: number, previous: number): GrowthResult {
  if (previous === 0 && current > 0) {
    return { text: 'Baru ada data pada periode ini', tone: 'positive' };
  }
  if (previous === 0 && current === 0) {
    return { text: 'Belum ada perbandingan', tone: 'neutral' };
  }
  if (current === previous) {
    return { text: 'Stabil dibanding periode sebelumnya', tone: 'neutral' };
  }

  const percentage = Math.round(((current - previous) / previous) * 100);
  if (!Number.isFinite(percentage)) {
    return { text: 'Belum ada perbandingan', tone: 'neutral' };
  }

  return {
    text: `${percentage > 0 ? '+' : ''}${percentage}% dibanding periode sebelumnya`,
    tone: percentage > 0 ? 'positive' : 'negative',
  };
}

function getRevenue(transactions: TransactionRow[], paidOrders: Order[]) {
  if (transactions.length > 0) {
    return transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }
  return paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
}

function getRevenueLabel(mode: RangeMode) {
  if (mode === 'today') return 'Pendapatan Hari Ini';
  if (mode === '7d') return 'Pendapatan 7 Hari';
  if (mode === '30d') return 'Pendapatan 30 Hari';
  return 'Pendapatan Periode Ini';
}

function getPeriodLabel(mode: RangeMode) {
  if (mode === 'today') return 'Hari Ini';
  if (mode === '7d') return '7 Hari';
  if (mode === '30d') return '30 Hari';
  return 'Periode Ini';
}

function getChartSubtitle(mode: RangeMode, customStart: string, customEnd: string) {
  if (mode === 'today') return '7 hari terakhir - hari ini ditandai hijau';
  if (mode === '7d') return '7 hari terakhir';
  if (mode === '30d') return '30 hari terakhir, dikelompokkan per minggu';
  return `${customStart || '-'} sampai ${customEnd || '-'}`;
}

function GrowthText({ growth }: { growth: GrowthResult }) {
  const Icon = growth.tone === 'positive' ? ArrowUpRight : growth.tone === 'negative' ? ArrowDownRight : Minus;
  const className = growth.tone === 'positive'
    ? 'text-emerald-400'
    : growth.tone === 'negative'
      ? 'text-rose-400'
      : 'text-slate-500';

  return (
    <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${className}`}>
      <Icon className="w-3 h-3" />
      <span>{growth.text}</span>
    </p>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl min-h-[150px] animate-pulse">
      <div className="flex justify-between mb-6">
        <div className="h-3 w-28 rounded bg-slate-800" />
        <div className="h-8 w-8 rounded-lg bg-slate-800" />
      </div>
      <div className="h-6 w-32 rounded bg-slate-800 mb-3" />
      <div className="h-3 w-40 rounded bg-slate-850" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-14 rounded-xl bg-slate-950 border border-slate-850" />
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [rangeMode, setRangeMode] = useState<RangeMode>('today');
  const [customStart, setCustomStart] = useState(() => toInputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.business_id) return;
    const bizId = profile.business_id;
    let debounceTimer: NodeJS.Timeout;

    const loadData = async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      const [ordersResult, productsResult, transactionsResult] = await Promise.all([
        supabaseClient
          .from('orders')
          .select('*, items:order_items(*), payments(*)')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('products')
          .select('*')
          .eq('business_id', bizId)
          .order('name', { ascending: true }),
        supabaseClient
          .from('transactions')
          .select('*')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      setOrders((ordersResult.data || []).map(mapDbOrderToOrder));
      setProducts((productsResult.data || []).map((product) => ({
        id: product.id || '',
        name: product.name || '',
        category: product.category || 'Makanan',
        price: Number(product.price || 0),
        stock: product.stock ?? 0,
        imageUrl: product.image_url || '',
        isActive: product.is_active ?? true,
      })));
      setTransactions((transactionsResult.data || []) as TransactionRow[]);
      setIsLoading(false);
    };

    loadData().catch((err) => {
      console.error('Failed to load dashboard data:', err);
      setIsLoading(false);
    });

    const triggerReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadData(false).catch((err) => {
          console.error('Failed to reload dashboard data:', err);
          setIsLoading(false);
        });
      }, 500);
    };

    const channelOrders = realtimeService.subscribeToOrdersByBusinessId(bizId, triggerReload);
    const channelTx = realtimeService.subscribeToTransactionsByBusinessId(bizId, triggerReload);

    return () => {
      clearTimeout(debounceTimer);
      realtimeService.unsubscribeChannel(channelOrders);
      realtimeService.unsubscribeChannel(channelTx);
    };
  }, [profile?.business_id]);

  const range = useMemo(() => getRange(rangeMode, customStart, customEnd), [rangeMode, customStart, customEnd]);
  const chartRange = useMemo(() => {
    if (rangeMode !== 'today') return range;
    const now = new Date();
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() - 6);
    const durationMs = now.getTime() - start.getTime() + 1;
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs + 1);
    return { start, end: now, previousStart, previousEnd };
  }, [range, rangeMode]);
  const chartRangeMode: RangeMode = rangeMode === 'today' ? '7d' : rangeMode;

  const currentOrders = useMemo(
    () => orders.filter((order) => order.status !== 'Cancelled' && isWithin(order.createdAt, range.start, range.end)),
    [orders, range]
  );
  const previousOrders = useMemo(
    () => orders.filter((order) => order.status !== 'Cancelled' && isWithin(order.createdAt, range.previousStart, range.previousEnd)),
    [orders, range]
  );
  const currentPaidOrders = useMemo(() => currentOrders.filter(isPaidOrder), [currentOrders]);
  const previousPaidOrders = useMemo(() => previousOrders.filter(isPaidOrder), [previousOrders]);

  const currentTransactions = useMemo(
    () => transactions.filter((tx) => isSuccessfulTransaction(tx) && isWithin(tx.created_at, range.start, range.end)),
    [transactions, range]
  );
  const previousTransactions = useMemo(
    () => transactions.filter((tx) => isSuccessfulTransaction(tx) && isWithin(tx.created_at, range.previousStart, range.previousEnd)),
    [transactions, range]
  );
  const chartPaidOrders = useMemo(
    () => orders.filter((order) => isPaidOrder(order) && isWithin(order.paidAt || order.completedAt || order.createdAt, chartRange.start, chartRange.end)),
    [orders, chartRange]
  );
  const chartTransactions = useMemo(
    () => transactions.filter((tx) => isSuccessfulTransaction(tx) && isWithin(tx.created_at, chartRange.start, chartRange.end)),
    [transactions, chartRange]
  );

  const revenue = getRevenue(currentTransactions, currentPaidOrders);
  const previousRevenue = getRevenue(previousTransactions, previousPaidOrders);
  const totalOrdersCount = currentOrders.length;
  const previousOrdersCount = previousOrders.length;
  const avgOrderValue = currentPaidOrders.length > 0 ? revenue / currentPaidOrders.length : 0;
  const previousAvgOrderValue = previousPaidOrders.length > 0 ? previousRevenue / previousPaidOrders.length : 0;

  const productSales: Record<string, number> = {};
  currentPaidOrders.forEach((order) => {
    order.items.forEach((item) => {
      productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
    });
  });

  const [bestSellerName, bestSellerQty] = Object.entries(productSales).reduce<[string, number]>(
    (best, current) => (current[1] > best[1] ? current : best),
    ['-', 0]
  );

  const lowStockProducts = products.filter((product) => product.isActive && product.stock <= 5);
  const lowStockCount = lowStockProducts.length;

  const recentTransactions = currentTransactions.length > 0
    ? currentTransactions.slice(0, 5)
    : currentPaidOrders
      .sort((a, b) => new Date(b.paidAt || b.completedAt || b.createdAt).getTime() - new Date(a.paidAt || a.completedAt || a.createdAt).getTime())
      .slice(0, 5);

  const trendEvents: SalesTrendEvent[] = chartTransactions.length > 0
    ? chartTransactions.map((tx) => ({ createdAt: tx.created_at, amount: Number(tx.amount || 0) }))
    : chartPaidOrders.map((order) => ({
      createdAt: order.paidAt || order.completedAt || order.createdAt,
      amount: order.totalAmount,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Ringkasan Bisnis</h1>
          <p className="text-xs text-slate-400 mt-1">Pantau performa penjualan, pesanan masuk, dan ketersediaan stok berdasarkan periode pilihan.</p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRangeMode(option.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                  rangeMode === option.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {rangeMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <span>sampai</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-tr-2xl" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">{getRevenueLabel(rangeMode)}</span>
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/10">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{formatRupiah(revenue)}</h3>
            <GrowthText growth={calculateGrowth(revenue, previousRevenue)} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-tr-2xl" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Total Pesanan {getPeriodLabel(rangeMode)}</span>
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/10">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{totalOrdersCount} Pesanan</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Termasuk pesanan belum dibayar</p>
            <GrowthText growth={calculateGrowth(totalOrdersCount, previousOrdersCount)} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-teal-500/5 to-transparent rounded-tr-2xl" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Rata-Rata Pesanan {getPeriodLabel(rangeMode)}</span>
            <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-400 border border-teal-500/10">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{formatRupiah(avgOrderValue)}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Nilai rata-rata per pesanan</p>
            <GrowthText growth={calculateGrowth(avgOrderValue, previousAvgOrderValue)} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-tr-2xl" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Produk Terlaris {getPeriodLabel(rangeMode)}</span>
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 border border-amber-500/10">
              <ShoppingBasket className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-white truncate max-w-[180px]">{bestSellerName}</h3>
            {bestSellerQty > 0 ? (
              <p className="text-[10px] text-amber-400 mt-1 font-semibold">Terjual {bestSellerQty} item pada periode ini</p>
            ) : (
              <p className="text-[10px] text-slate-500 mt-1">Belum ada transaksi</p>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {lowStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-rose-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>Peringatan Inventaris:</strong> Ada <strong>{lowStockCount} produk</strong> yang habis atau hampir habis stok.
            </span>
          </div>
          <Link href="/admin/stock" className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-all whitespace-nowrap bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/10">
            <span>Kelola Stok</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-start mb-6 gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Tren Penjualan</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                  {getChartSubtitle(rangeMode, customStart, customEnd)}
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
            </div>

            <SalesTrendChart
              data={trendEvents}
              range={chartRangeMode}
              dateRange={{ start: chartRange.start, end: chartRange.end }}
              isLoading={isLoading}
              highlightToday={rangeMode === 'today'}
              emptyState={{
                title: 'Belum ada data penjualan',
                description: 'Grafik akan muncul setelah transaksi pertama berhasil dibayar.',
              }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Stok Terendah</span>
            <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-950 border border-slate-900">{lowStockCount} Produk</span>
          </h3>

          {isLoading ? (
            <ListSkeleton />
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-xs">Belum ada produk.</div>
          ) : lowStockProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-xs">Semua produk memiliki stok yang cukup.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {lowStockProducts.slice(0, 4).map((product) => (
                <div key={product.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 border border-slate-850">
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-semibold text-slate-200 line-clamp-1">{product.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{product.category}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-black ${
                    product.stock === 0
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                  }`}>
                    {product.stock === 0 ? 'HABIS' : `${product.stock} Pcs`}
                  </span>
                </div>
              ))}

              {lowStockProducts.length > 4 && (
                <Link href="/admin/stock" className="text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 mt-2 block transition-all">
                  Lihat {lowStockProducts.length - 4} Produk Lainnya &rarr;
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-850">
          <h3 className="text-sm font-bold text-white">Transaksi Sukses Terkini</h3>
          <Link href="/admin/transactions" className="text-xs text-emerald-400 hover:text-emerald-350 font-bold transition-all flex items-center gap-1">
            <span>Seluruh Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">Belum ada transaksi sukses yang tercatat.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-mono">
                  <th className="py-2.5 font-bold uppercase tracking-wider">Antrean</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider">Pelanggan</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider">Tanggal</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider text-right">Metode</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {recentTransactions.map((transaction) => {
                  const matchingOrder = 'queueNumber' in transaction
                    ? transaction
                    : orders.find((order) => order.id === transaction.order_id);
                  const createdAt = 'createdAt' in transaction ? transaction.createdAt : transaction.created_at;
                  const amount = 'totalAmount' in transaction ? transaction.totalAmount : Number(transaction.amount || 0);
                  const paymentMethod = 'paymentMethod' in transaction ? transaction.paymentMethod : transaction.payment_method;

                  return (
                    <tr key={transaction.id} className="text-slate-300 hover:bg-slate-850/30 transition-all">
                      <td className="py-3 font-mono font-bold text-emerald-400">{matchingOrder?.queueNumber || '-'}</td>
                      <td className="py-3 font-semibold text-white">{matchingOrder?.customerName || 'Pelanggan'}</td>
                      <td className="py-3 text-slate-500">{formatDate(createdAt)}</td>
                      <td className="py-3 text-right font-semibold text-slate-400">{formatPaymentMethod(paymentMethod)}</td>
                      <td className="py-3 text-right font-bold text-emerald-400">{formatRupiah(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
