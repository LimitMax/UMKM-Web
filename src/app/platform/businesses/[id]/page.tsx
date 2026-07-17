'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Building2,
  Users,
  CreditCard,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShoppingCart,
  TrendingUp,
  Mail,
  MapPin,
  Phone,
  Ban,
  Archive,
  Trash2,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Calendar,
  Layers,
  Activity
} from 'lucide-react';
import { useAuth } from '../../../../components/AuthProvider';
import { supabaseClient } from '../../../../lib/supabase/client';

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'cashier';
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  plan_id: string;
  status: string;
  billing_cycle: string | null;
  started_at: string;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
}

interface BusinessDetail {
  id: string;
  name: string;
  business_type: string | null;
  slug: string | null;
  plan_code: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  description: string | null;
  address: string | null;
  whatsapp_number: string | null;
  opening_hours: string | null;
  tax_enabled: boolean | null;
  tax_percentage: number | null;
  service_charge_enabled: boolean | null;
  service_charge_percentage: number | null;
  public_order_enabled: boolean | null;
  created_at: string;
  updated_at: string;
  currency?: string | null;
  status: 'trial' | 'active' | 'suspended' | 'archived';
  suspended_reason?: string | null;
  suspended_at?: string | null;
  suspended_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface DetailData {
  business: BusinessDetail;
  profiles: ProfileRow[];
  subscriptions: SubscriptionRow[];
  productsSummary: {
    totalProducts: number;
    categories: string[];
  };
  orderSummary: {
    totalOrders: number;
    totalRevenue: number;
    statusBreakdown: Record<string, number>;
  };
  aiSummary: {
    totalInsights: number;
    totalPromos: number;
  };
  recentActivity: Array<{
    id: string;
    customer_name: string;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
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

function StatusBadge({ status, deletedAt }: { status: string | null; deletedAt?: string | null }) {
  if (deletedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-450 border border-rose-500/20">
        <Trash2 className="w-3 h-3" /> Soft Deleted
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Aktif
      </span>
    );
  }
  if (status === 'trial') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
        <Clock className="w-3 h-3" /> Trial
      </span>
    );
  }
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
        <Ban className="w-3 h-3" /> Suspended
      </span>
    );
  }
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Archive className="w-3 h-3" /> Archived
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
      {status ?? '—'}
    </span>
  );
}

export default function PlatformBusinessDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user: supabaseUser } = useAuth();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Suspension modal state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendError, setSuspendError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/businesses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat detail bisnis.');
      }

      const json: DetailData = await res.json();
      setData(json);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadDetail();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadDetail]);

  const handleStatusChange = async (action: string, reason?: string) => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/businesses/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal memperbarui status bisnis.');
      }

      setSuspendModalOpen(false);
      setSuspendReason('');
      await loadDetail();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) {
      setSuspendError('Alasan penangguhan wajib diisi.');
      return;
    }
    void handleStatusChange('suspend', suspendReason);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Memuat detail bisnis...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-4">
        <Link
          href="/platform/businesses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke daftar bisnis</span>
        </Link>
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { business, profiles, subscriptions, productsSummary, orderSummary, aiSummary, recentActivity } = data;

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/platform/businesses"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Manajemen Bisnis</span>
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-white font-bold truncate max-w-[200px]">{business.name}</span>
        </div>
      </div>

      {/* Warning Banners for Suspended / Deleted */}
      {business.status === 'suspended' && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl mt-0.5 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-400 font-mono">Penyewa Ini Ditangguhkan (Suspended)</h4>
              <p className="text-[11px] text-rose-200/80 leading-relaxed mt-1 font-sans">
                Akses ke dashboard, POS kasir, dan link order pelanggan ditutup sementara.
              </p>
              {business.suspended_reason && (
                <div className="mt-2.5 p-3 bg-slate-950/60 border border-slate-850 rounded-xl text-[11px] text-white">
                  <span className="text-[9px] font-mono text-slate-500 block mb-0.5 uppercase">Alasan:</span>
                  &ldquo;{business.suspended_reason}&rdquo;
                </div>
              )}
              {business.suspended_at && (
                <p className="text-[9px] text-slate-500 font-mono mt-1.5">
                  Ditangguhkan pada: {formatDate(business.suspended_at)} oleh Admin {business.suspended_by}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm(`Aktifkan kembali akses bisnis "${business.name}"?`)) {
                void handleStatusChange('activate');
              }
            }}
            disabled={actionLoading}
            className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 disabled:opacity-50 flex-shrink-0 font-sans"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Aktifkan Akses</span>
          </button>
        </div>
      )}

      {business.deleted_at && (
        <div className="p-4 rounded-2xl bg-rose-950/25 border border-rose-900/40 flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-500/10 border border-rose-900/30 text-rose-400 rounded-xl mt-0.5 flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-400 font-mono">Penyewa Dihapus Sementara (Soft Deleted)</h4>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Bisnis ini telah dihapus oleh platform owner. Semua data disembunyikan dari daftar penyewa aktif.
              </p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                Dihapus pada: {formatDate(business.deleted_at)} oleh Admin {business.deleted_by}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm(`Pulihkan kembali bisnis "${business.name}"?`)) {
                void handleStatusChange('restore');
              }
            }}
            disabled={actionLoading}
            className="w-full md:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-violet-950/20 disabled:opacity-50 flex-shrink-0 font-sans"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Bisnis</span>
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-violet-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Platform Console
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{business.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{business.business_type ?? 'Bisnis'}</p>
          </div>
        </div>
        
        {/* Controls Actions Header Panel */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={business.status} deletedAt={business.deleted_at} />
          
          {/* Quick Activate/Suspend Header Buttons */}
          {business.status === 'suspended' ? (
            <button
              onClick={() => {
                if (window.confirm(`Aktifkan kembali akses bisnis "${business.name}"?`)) {
                  void handleStatusChange('activate');
                }
              }}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/20 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Activate</span>
            </button>
          ) : (
            !business.deleted_at && business.status !== 'archived' && (
              <button
                onClick={() => setSuspendModalOpen(true)}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-rose-650 hover:bg-rose-550 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/20 disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Suspend Access</span>
              </button>
            )
          )}

          {/* Archive Action */}
          {business.status !== 'archived' && !business.deleted_at && (
            <button
              onClick={() => {
                if (window.confirm(`Arsipkan bisnis "${business.name}"?`)) {
                  void handleStatusChange('archive');
                }
              }}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-slate-800 border border-slate-700 hover:border-slate-650 text-slate-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          )}

          {/* Delete Action */}
          {!business.deleted_at && (
            <button
              onClick={() => {
                if (window.confirm(`Hapus sementara (Soft Delete) bisnis "${business.name}"?`)) {
                  void handleStatusChange('soft_delete');
                }
              }}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-rose-950/40 border border-rose-900/40 text-rose-450 hover:bg-rose-600 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Soft Delete</span>
            </button>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column — Detailed Cards */}
        <div className="lg:col-span-2 space-y-6">

          {/* Business Profile Info */}
          <div className="glass rounded-2xl border border-slate-800/80 p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-sm font-bold text-white">Profil & Konfigurasi Bisnis</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
              {[
                { label: 'Business ID', value: business.id, mono: true },
                { label: 'Slug / Path URL', value: business.slug ? `/order/${business.slug}` : '—', mono: true },
                { label: 'Fulfillment / Pengiriman', value: 'Dine-In, Takeaway, Delivery' },
                { label: 'Pajak (Tax)', value: business.tax_enabled ? `${business.tax_percentage ?? 0}%` : 'Nonaktif' },
                { label: 'Biaya Layanan', value: business.service_charge_enabled ? `${business.service_charge_percentage ?? 0}%` : 'Nonaktif' },
                { label: 'Order Online', value: business.public_order_enabled ? 'Aktif' : 'Nonaktif' },
                { label: 'Mata Uang', value: business.currency || 'IDR', mono: true },
                { label: 'Status Server POS', value: 'Online' },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">{field.label}</p>
                  <p className={`text-white font-semibold ${field.mono ? 'font-mono text-[11px] text-violet-300' : ''}`}>
                    {field.value}
                  </p>
                </div>
              ))}
            </div>

            {(business.address || business.whatsapp_number || business.opening_hours || business.description) && (
              <div className="mt-5 pt-4 border-t border-slate-850 space-y-3">
                {business.description && (
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Deskripsi Toko</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{business.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {business.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-400">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <span>{business.address}</span>
                    </div>
                  )}
                  {business.whatsapp_number && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>{business.whatsapp_number}</span>
                    </div>
                  )}
                  {business.opening_hours && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>{business.opening_hours}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Products Summary Card */}
          <div className="glass rounded-2xl border border-slate-800/80 p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-sm font-bold text-white">Ringkasan Produk Menu</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase mb-1">Total Item Menu</span>
                <span className="text-2xl font-black text-white">{productsSummary.totalProducts}</span>
              </div>
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase mb-1">Kategori Terdaftar</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {productsSummary.categories.length === 0 ? (
                    <span className="text-slate-500">—</span>
                  ) : (
                    productsSummary.categories.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[9px] font-bold text-slate-350">
                        {c}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity (Orders) */}
          <div className="glass rounded-2xl border border-slate-800/80 p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-sm font-bold text-white">Aktivitas Transaksi Terakhir (UAT)</h2>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-sans">
                Belum ada aktivitas transaksi yang tercatat untuk bisnis ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 font-mono text-slate-500 uppercase text-[9px] tracking-wider">
                      <th className="py-2.5">Tanggal</th>
                      <th className="py-2.5">Pelanggan</th>
                      <th className="py-2.5">Total</th>
                      <th className="py-2.5 text-center">Status</th>
                      <th className="py-2.5 text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((act) => (
                      <tr key={act.id} className="border-b border-slate-850/60 hover:bg-slate-900/10">
                        <td className="py-3 text-slate-400 whitespace-nowrap">{formatDate(act.created_at)}</td>
                        <td className="py-3 font-semibold text-white truncate max-w-[120px]">{act.customer_name}</td>
                        <td className="py-3 font-mono text-slate-300">{formatRupiah(act.total_amount)}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            act.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {act.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            act.payment_status === 'Paid' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {act.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Column — Sidebar Info */}
        <div className="space-y-6">

          {/* Owner details */}
          <div className="glass rounded-2xl border border-slate-800/80 p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-xs font-bold text-white">Owner / Admin Bisnis</h2>
            </div>
            
            {profiles.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Tidak ada owner terdaftar.</p>
            ) : (
              <div className="space-y-3.5 text-xs">
                {profiles.filter((p) => p.role === 'admin').map((p) => (
                  <div key={p.id} className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-violet-650 text-white font-bold text-xs flex items-center justify-center uppercase">
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white leading-tight">{p.full_name}</p>
                        <span className="text-[9px] font-mono text-violet-400 tracking-wider uppercase block mt-0.5">ADMIN (OWNER)</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-900 space-y-1.5 text-slate-400">
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{p.email}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-mono text-[9px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>Registered: {formatDate(p.created_at)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue and Orders summaries */}
          <div className="glass rounded-2xl border border-slate-800/80 p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold text-white">Ringkasan Pendapatan</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Total Pendapatan (Paid)</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <p className="text-xl font-black text-white">{formatRupiah(orderSummary.totalRevenue)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Total Pesanan</p>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-400" />
                  <p className="text-xl font-black text-white">{orderSummary.totalOrders.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Metrics Summary */}
          <div className="glass rounded-2xl border border-slate-800/80 p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-xs font-bold text-white">Layanan AI Insights</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">Insights</span>
                <span className="text-lg font-black text-white">{aiSummary.totalInsights}</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">Promo AI</span>
                <span className="text-lg font-black text-white">{aiSummary.totalPromos}</span>
              </div>
            </div>
          </div>

          {/* Subscription history */}
          <div className="glass rounded-2xl border border-slate-800/80 p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-teal-400" />
              </div>
              <h2 className="text-xs font-bold text-white">Riwayat Paket Langganan</h2>
            </div>

            {subscriptions.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Belum ada riwayat pembayaran langganan.</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {sub.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sub.billing_cycle ?? 'monthly'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      <p>Mulai: {formatDate(sub.started_at)}</p>
                      {sub.trial_ends_at && (
                        <p>Trial Ends: {formatDate(sub.trial_ends_at)}</p>
                      )}
                      {sub.current_period_end && (
                        <p>Period: {formatDate(sub.current_period_start)} – {formatDate(sub.current_period_end)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Suspend Confirmation Modal */}
      {suspendModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Tangguhkan Bisnis (Suspend)</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menangguhkan akses untuk bisnis <span className="font-bold text-white">&ldquo;{business.name}&rdquo;</span>?
                </p>
              </div>
            </div>

            <form onSubmit={handleSuspendSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">
                  Alasan Penangguhan (Wajib diisi & akan ditampilkan ke Owner)
                </label>
                <textarea
                  required
                  rows={4}
                  value={suspendReason}
                  onChange={(e) => {
                    setSuspendReason(e.target.value);
                    setSuspendError('');
                  }}
                  placeholder="Misalnya: Melanggar ketentuan UAT, pembayaran langganan kadaluarsa, penyalahgunaan sistem..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-rose-500 resize-none font-sans"
                />
                {suspendError && (
                  <p className="text-[10px] text-rose-400 font-mono mt-1">{suspendError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all font-sans"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-rose-650 hover:bg-rose-550 text-white font-bold text-xs rounded-xl transition-all shadow-lg hover:shadow-rose-900/25 flex items-center gap-1.5 font-sans"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Tangguhkan Akses</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
