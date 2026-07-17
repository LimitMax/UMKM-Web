'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Clock,
  Loader2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';

interface PlatformStats {
  totalBusinesses: number;
  activeBusinesses: number;
  todayOrders: number;
  todayRevenue: number;
  activeSubscriptions: number;
  trialBusinesses: number;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub?: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, sub, loading }: StatCardProps) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-850 p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-slate-800 transition-colors">
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-xl pointer-events-none opacity-40 bg-current" style={{ color: iconColor.replace('text-', '') }} />
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        {loading ? (
          <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-lg" />
        ) : (
          <p className="text-2xl font-black text-white">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function PlatformDashboardPage() {
  const { user: supabaseUser } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/platform/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat statistik platform.');
      }

      const data: PlatformStats = await res.json();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadStats();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadStats]);

  const todayLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-violet-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              PLATFORM OWNER
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">{todayLabel}</p>
        </div>

        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Bisnis"
          value={stats?.totalBusinesses ?? 0}
          icon={Building2}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/15"
          sub="Seluruh bisnis terdaftar"
          loading={loading}
        />
        <StatCard
          label="Bisnis Aktif"
          value={stats?.activeBusinesses ?? 0}
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/15"
          sub="Berlangganan aktif"
          loading={loading}
        />
        <StatCard
          label="Order Hari Ini"
          value={stats?.todayOrders ?? 0}
          icon={ShoppingCart}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/15"
          sub="Di semua bisnis"
          loading={loading}
        />
        <StatCard
          label="Pendapatan Hari Ini"
          value={stats ? formatRupiah(stats.todayRevenue) : 'Rp 0'}
          icon={TrendingUp}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/15"
          sub="Order lunas hari ini"
          loading={loading}
        />
        <StatCard
          label="Langganan Aktif"
          value={stats?.activeSubscriptions ?? 0}
          icon={CreditCard}
          iconColor="text-teal-400"
          iconBg="bg-teal-500/15"
          sub="Dari semua bisnis"
          loading={loading}
        />
        <StatCard
          label="Bisnis Trial"
          value={stats?.trialBusinesses ?? 0}
          icon={Clock}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/15"
          sub="Masa percobaan aktif"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-900 rounded-2xl border border-slate-850 p-6">
        <h2 className="text-sm font-bold text-white mb-4">Akses Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/platform/businesses"
            className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-violet-500/40 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Manajemen Bisnis</p>
                <p className="text-[10px] text-slate-500">Lihat & kelola semua bisnis</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
          </Link>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
                <Loader2 className="w-4.5 h-4.5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Fitur Lanjutan</p>
                <p className="text-[10px] text-slate-600">Akan tersedia di fase berikutnya</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last refreshed */}
      {lastRefreshed && (
        <p className="text-[10px] text-slate-600 text-right font-mono">
          Data terakhir diperbarui: {lastRefreshed.toLocaleTimeString('id-ID')}
        </p>
      )}
    </div>
  );
}
