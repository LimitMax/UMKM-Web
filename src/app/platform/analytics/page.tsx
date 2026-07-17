'use client';

import { useState, useCallback } from 'react';
import {
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Brain,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase/client';

interface AnalyticsData {
  metrics: {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    expiredTenants: number;
    mrr: number;
    arr: number;
    todayRevenue: number;
    globalOrders: number;
    globalGMV: number;
    averageOrderValue: number;
  };
  aiAnalytics: {
    llmRequests: number;
    estimatedTokens: number;
    mostActiveAiTenantName: string;
    mostUsedAiFeature: string;
    averageResponseTime: string;
  };
  leaderboards: {
    topRevenue: Array<{ business_id: string; business_name: string; gmv: number; orders: number }>;
    topOrders: Array<{ business_id: string; business_name: string; gmv: number; orders: number }>;
    newestTenants: Array<{ business_id: string; business_name: string; created_at: string; plan_code: string }>;
  };
  chartsData: Array<{ date: string; registrations: number; revenue: number; orders: number }>;
  aiInsights: {
    tenantsNoActivity: string[];
    trialExpiringSoon: string[];
    fastestGrowing: string[];
    inactiveTenants: string[];
    subscriptionRisk: string[];
    revenueTrend: string;
    summary: string;
  };
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function PlatformAnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const [data, setData] = useState<AnalyticsData | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('global_analytics_30d');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const [lastGenerated, setLastGenerated] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('global_analytics_30d_timestamp');
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat analitik platform.');
      }

      const json = await res.json();
      
      if (typeof window !== 'undefined') {
        const timestamp = new Date().toISOString();
        localStorage.setItem(`global_analytics_${range}`, JSON.stringify(json));
        localStorage.setItem(`global_analytics_${range}_timestamp`, timestamp);
        setLastGenerated(timestamp);
      }
      setData(json);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  const { metrics, aiAnalytics, leaderboards, chartsData, aiInsights } = data || {
    metrics: { totalTenants: 0, activeTenants: 0, trialTenants: 0, suspendedTenants: 0, expiredTenants: 0, mrr: 0, arr: 0, todayRevenue: 0, globalOrders: 0, globalGMV: 0, averageOrderValue: 0 },
    aiAnalytics: { llmRequests: 0, estimatedTokens: 0, mostActiveAiTenantName: '', mostUsedAiFeature: '', averageResponseTime: '' },
    leaderboards: { topRevenue: [], topOrders: [], newestTenants: [] },
    chartsData: [],
    aiInsights: { tenantsNoActivity: [], trialExpiringSoon: [], fastestGrowing: [], inactiveTenants: [], subscriptionRisk: [], revenueTrend: '', summary: '' }
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-violet-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Platform Intel
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Analisis Global Platform</h1>
          <p className="text-xs text-slate-400 mt-0.5">Pemantauan GMV, registrasi, pendapatan MRR, dan log aktivitas AI global.</p>
        </div>
        
        {/* Date range filter selector AND Action buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start sm:self-center">
          {data && lastGenerated && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-xl">
              <span>Terakhir dianalisis: {formatDateTime(lastGenerated)}</span>
            </div>
          )}
          
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {(['7d', '30d', '90d', '1y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRange(r);
                  if (typeof window !== 'undefined') {
                    const saved = localStorage.getItem(`global_analytics_${r}`);
                    if (saved) {
                      try {
                        setData(JSON.parse(saved));
                      } catch {
                        setData(null);
                      }
                    } else {
                      setData(null);
                    }
                    setLastGenerated(localStorage.getItem(`global_analytics_${r}_timestamp`));
                  }
                }}
                disabled={loading}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border-none cursor-pointer uppercase ${
                  range === r ? 'bg-violet-650 text-white' : 'text-slate-400 hover:text-white bg-transparent'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : r === '90d' ? '90 Hari' : '1 Tahun'}
              </button>
            ))}
          </div>

          {data && (
            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-550 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Analisis Ulang</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500 font-sans">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span className="text-xs">Menganalisis data platform secara real-time...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5 font-sans">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMsg}</p>
            <button 
              onClick={loadAnalytics}
              className="mt-2 text-rose-400 hover:underline font-bold bg-transparent border-none cursor-pointer p-0 text-[10px]"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-slate-900/10 border border-slate-850 rounded-3xl max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl flex items-center justify-center mb-6">
            <Brain className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-white mb-2">Mulai Analisis Global Platform</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Pemantauan GMV, registrasi, pendapatan MRR, log aktivitas AI global, serta analisis eksekutif berbasis kecerdasan buatan (AI) untuk seluruh jaringan merchant.
          </p>
          <button
            onClick={loadAnalytics}
            className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-xs flex items-center gap-2 border-none cursor-pointer"
          >
            <span>🚀 Lakukan Analisis</span>
          </button>
        </div>
      ) : (
        <>
          {/* Main SaaS Financial Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Monthly Recurring Revenue (MRR)', val: formatRupiah(metrics.mrr), icon: TrendingUp, col: 'text-violet-400', desc: 'Estimasi pendapatan SaaS bulanan' },
          { label: 'Annual Recurring Revenue (ARR)', val: formatRupiah(metrics.arr), icon: Sparkles, col: 'text-indigo-400', desc: 'SaaS Run-Rate 12 bulan depan' },
          { label: 'SaaS Revenue Hari Ini', val: formatRupiah(metrics.todayRevenue), icon: CreditCard, col: 'text-teal-400', desc: 'Invoice SaaS terbayar hari ini' },
          { label: 'Gross Merchandise Value (GMV)', val: formatRupiah(metrics.globalGMV), icon: ShoppingCart, col: 'text-emerald-400', desc: `Total transaksi menu (${range})` },
        ].map((c) => (
          <div key={c.label} className="glass rounded-2xl border border-slate-850 p-5 bg-slate-900/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
                <p className="text-lg font-black text-white">{c.val}</p>
              </div>
              <div className={`p-2 bg-slate-950/65 rounded-xl border border-slate-850 ${c.col}`}>
                <c.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-550 mt-3">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Tenants State & Order Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Tenant', val: metrics.totalTenants.toLocaleString('id-ID'), col: 'text-white' },
          { label: 'Penyewa Aktif', val: metrics.activeTenants.toLocaleString('id-ID'), col: 'text-emerald-400' },
          { label: 'Trial Aktif', val: metrics.trialTenants.toLocaleString('id-ID'), col: 'text-blue-400' },
          { label: 'Ditangguhkan', val: metrics.suspendedTenants.toLocaleString('id-ID'), col: 'text-rose-450' },
          { label: 'Orders Global', val: metrics.globalOrders.toLocaleString('id-ID'), col: 'text-indigo-400' },
          { label: 'AOV (Average Order)', val: formatRupiah(metrics.averageOrderValue), col: 'text-amber-400' },
        ].map((c) => (
          <div key={c.label} className="bg-slate-900/40 border border-slate-850/80 rounded-2xl p-4 text-center">
            <p className="text-[9px] font-mono text-slate-500 uppercase mb-1 truncate">{c.label}</p>
            <p className={`text-sm font-black ${c.col}`}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* AI Platform Insights Box */}
      <div className="glass rounded-3xl border border-slate-850 p-6 bg-slate-900/20">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-850">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <h2 className="text-sm font-bold text-white">AI Executive Platform Insights</h2>
        </div>
        
        <div className="space-y-4">
          <p className="text-xs text-slate-350 leading-relaxed font-sans font-medium">
            {aiInsights.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Registrasi & Inaktivitas</span>
              {aiInsights.tenantsNoActivity.length === 0 ? (
                <p className="text-slate-400">Semua tenant aktif beroperasi.</p>
              ) : (
                <ul className="list-disc pl-3.5 text-slate-300 space-y-1">
                  {aiInsights.tenantsNoActivity.map(t => <li key={t}>{t}</li>)}
                </ul>
              )}
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Risiko & Trial Kadaluarsa</span>
              {aiInsights.trialExpiringSoon.length === 0 ? (
                <p className="text-slate-400">Tidak ada trial berakhir segera.</p>
              ) : (
                <ul className="list-disc pl-3.5 text-slate-300 space-y-1">
                  {aiInsights.trialExpiringSoon.map(t => <li key={t}>{t}</li>)}
                </ul>
              )}
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Pertumbuhan & Keuangan</span>
              <p className="text-slate-300 leading-relaxed font-sans">{aiInsights.revenueTrend}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section: Registration, Revenue, and Orders trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Revenue & Registrations */}
        <div className="glass rounded-2xl border border-slate-850 p-6 bg-slate-900/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Trend Pendapatan & Registrasi</h3>
            <span className="text-[9px] font-mono text-slate-500">Agregat harian ({range})</span>
          </div>

          {/* Styled CSS Bar Chart */}
          <div className="h-44 flex items-end gap-1 border-b border-slate-800 pb-2">
            {chartsData.map((d, index) => {
              const maxRevenue = Math.max(...chartsData.map(c => c.revenue), 1000);
              const heightPct = Math.max(3, Math.round((d.revenue / maxRevenue) * 100));
              return (
                <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-violet-600/70 group-hover:bg-violet-500 rounded-t transition-all min-h-[3px]"
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                    <p className="text-slate-400">{d.date}</p>
                    <p className="text-violet-400">Revenue: {formatRupiah(d.revenue)}</p>
                    <p className="text-white">Registrasi: {d.registrations}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2">
            <span>{chartsData[0]?.date}</span>
            <span>Tengah Periode</span>
            <span>{chartsData[chartsData.length - 1]?.date}</span>
          </div>
        </div>

        {/* Chart 2: Transaction Orders Trend */}
        <div className="glass rounded-2xl border border-slate-850 p-6 bg-slate-900/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Trend Order Global</h3>
            <span className="text-[9px] font-mono text-slate-500">Total volume order ({range})</span>
          </div>

          {/* Styled CSS Bar Chart */}
          <div className="h-44 flex items-end gap-1 border-b border-slate-800 pb-2">
            {chartsData.map((d, index) => {
              const maxOrders = Math.max(...chartsData.map(c => c.orders), 5);
              const heightPct = Math.max(3, Math.round((d.orders / maxOrders) * 100));
              return (
                <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-indigo-650/70 group-hover:bg-indigo-500 rounded-t transition-all min-h-[3px]"
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                    <p className="text-slate-400">{d.date}</p>
                    <p className="text-indigo-400">Orders: {d.orders} transaksi</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2">
            <span>{chartsData[0]?.date}</span>
            <span>Tengah Periode</span>
            <span>{chartsData[chartsData.length - 1]?.date}</span>
          </div>
        </div>

      </div>

      {/* Leaderboard Tables and AI Usage stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Tenants by GMV */}
        <div className="glass rounded-2xl border border-slate-850 p-5 bg-slate-900/10">
          <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">
            Top Revenue (GMV)
          </h3>
          {leaderboards.topRevenue.length === 0 ? (
            <div className="py-8 text-center text-slate-500">Belum ada data transaksi</div>
          ) : (
            <div className="space-y-3">
              {leaderboards.topRevenue.map((t, i) => (
                <div key={t.business_id} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 font-bold w-4">{i + 1}</span>
                    <span className="font-semibold text-white truncate max-w-[140px]">{t.business_name}</span>
                  </div>
                  <span className="font-mono font-semibold text-emerald-400">{formatRupiah(t.gmv)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Tenants by Orders */}
        <div className="glass rounded-2xl border border-slate-850 p-5 bg-slate-900/10">
          <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">
            Top Orders (Volume)
          </h3>
          {leaderboards.topOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500">Belum ada data transaksi</div>
          ) : (
            <div className="space-y-3">
              {leaderboards.topOrders.map((t, i) => (
                <div key={t.business_id} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 font-bold w-4">{i + 1}</span>
                    <span className="font-semibold text-white truncate max-w-[140px]">{t.business_name}</span>
                  </div>
                  <span className="font-mono font-semibold text-indigo-400">{t.orders} order</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Usage Analytics Box */}
        <div className="glass rounded-2xl border border-slate-850 p-5 bg-slate-900/10 space-y-4">
          <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-violet-400" />
            <span>AI Analytics & Token Log</span>
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Total Request LLM', val: aiAnalytics.llmRequests.toLocaleString('id-ID') },
              { label: 'Estimasi Tokens Terpakai', val: `${aiAnalytics.estimatedTokens.toLocaleString('id-ID')} tokens` },
              { label: 'Rata-rata Respon AI', val: aiAnalytics.averageResponseTime },
              { label: 'Penyewa Paling Aktif', val: aiAnalytics.mostActiveAiTenantName },
              { label: 'Fitur Paling Sering Digunakan', val: aiAnalytics.mostUsedAiFeature },
            ].map((item) => (
              <div key={item.label} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850 flex items-center justify-between">
                <span className="text-slate-450">{item.label}</span>
                <span className="font-semibold text-white text-right truncate max-w-[140px]">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Newest Tenants Table */}
      <div className="glass rounded-2xl border border-slate-850 p-5 bg-slate-900/10">
        <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">
          Merchant Baru Terdaftar
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Nama Toko</th>
                <th className="py-2.5 px-3">Toko ID</th>
                <th className="py-2.5 px-3 text-right">Paket Plan</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.newestTenants.map((b) => (
                <tr key={b.business_id} className="border-b border-slate-850/60 hover:bg-slate-900/5">
                  <td className="py-3 px-3 text-slate-400 font-mono">{formatDate(b.created_at)}</td>
                  <td className="py-3 px-3 font-semibold text-white">{b.business_name}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">{b.business_id}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full font-bold text-[9px] uppercase tracking-wider">
                      {b.plan_code}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

    </div>
  );
}
