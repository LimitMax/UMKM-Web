'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Ban,
  X,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';

interface SubscriptionRow {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  plan_id: string;
  plan_name: string;
  plan_code: string;
  status: 'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled';
  started_at: string;
  trial_start: string | null;
  trial_end: string | null;
  expires_at: string | null;
  renewal_at: string | null;
  cancelled_at: string | null;
  billing_status: string;
  latest_invoice_amount: number;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PlatformSubscriptionsPage() {
  const { user: supabaseUser } = useAuth();

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Renewal edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [targetSubId, setTargetSubId] = useState<string | null>(null);
  const [targetBizName, setTargetBizName] = useState('');
  const [newRenewalDate, setNewRenewalDate] = useState('');
  const [newExpiresDate, setNewExpiresDate] = useState('');

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/platform/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat daftar langganan.');
      }

      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadSubscriptions();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadSubscriptions]);

  const handleCancelSub = async (id: string, bizName: string) => {
    if (!window.confirm(`Batalkan secara paksa langganan untuk merchant "${bizName}"?`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/subscriptions/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'cancel' })
      });

      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(resData.message || 'Gagal membatalkan langganan.');
      }

      setSuccessMsg(`Langganan merchant "${bizName}" berhasil dibatalkan.`);
      await loadSubscriptions();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRenewalModal = (sub: SubscriptionRow) => {
    setTargetSubId(sub.id);
    setTargetBizName(sub.business_name);
    
    // Default values to current dates (or today's date if empty)
    const currentRenewal = sub.renewal_at ? new Date(sub.renewal_at).toISOString().split('T')[0] : '';
    const currentExpires = sub.expires_at ? new Date(sub.expires_at).toISOString().split('T')[0] : '';
    
    setNewRenewalDate(currentRenewal);
    setNewExpiresDate(currentExpires);
    setEditModalOpen(true);
  };

  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSubId) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/subscriptions/${targetSubId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'edit_renewal',
          renewalDate: newRenewalDate,
          expiresDate: newExpiresDate || undefined
        })
      });

      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(resData.message || 'Gagal memperbarui tanggal perpanjangan.');
      }

      setSuccessMsg(`Tanggal perpanjangan untuk "${targetBizName}" berhasil diperbarui.`);
      setEditModalOpen(false);
      await loadSubscriptions();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = subscriptions.filter((sub) => {
    const term = search.toLowerCase();
    return (
      sub.business_name.toLowerCase().includes(term) ||
      sub.plan_name.toLowerCase().includes(term) ||
      sub.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-violet-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              SaaS Billing
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Manajemen Langganan</h1>
          <p className="text-xs text-slate-400 mt-0.5">Pantau status pembayaran, masa trial, dan tanggal perpanjangan merchant aktif.</p>
        </div>
      </div>

      {/* Alert Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bisnis, plan, atau ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-violet-500 transition-all font-sans"
          />
        </div>
        <div className="text-slate-500 text-xs w-full sm:w-auto font-mono text-left sm:text-right">
          Total: {filtered.length} langganan
        </div>
      </div>

      {/* Subscription Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Memuat tabel...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
          <CreditCard className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-bold text-sm">Tidak ada langganan ditemukan</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800/80 rounded-2xl bg-slate-900/10">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 font-mono text-slate-500 uppercase text-[9px] tracking-wider bg-slate-950/40">
                <th className="p-4">Bisnis / Toko</th>
                <th className="p-4">Paket Plan</th>
                <th className="p-4 text-center">Status Langganan</th>
                <th className="p-4">Tanggal Perpanjangan</th>
                <th className="p-4 text-center">Invoice Terakhir</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr key={sub.id} className="border-b border-slate-850 hover:bg-slate-900/10 transition-colors">
                  {/* Business info */}
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-white leading-snug">{sub.business_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        ID: {sub.business_id.slice(0, 10)}...
                        <Link
                          href={`/platform/businesses/${sub.business_id}`}
                          className="text-violet-400 hover:underline inline-flex items-center gap-0.5"
                          title="Buka konsol bisnis"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </p>
                    </div>
                  </td>
                  
                  {/* Plan info */}
                  <td className="p-4">
                    <div>
                      <p className="font-semibold text-white">{sub.plan_name}</p>
                      <p className="text-[9px] text-violet-400 font-mono uppercase tracking-wider mt-0.5">{sub.plan_code}</p>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                      sub.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : sub.status === 'trial'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : sub.status === 'grace_period'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                    }`}>
                      {sub.status === 'grace_period' ? 'grace' : sub.status}
                    </span>
                  </td>

                  {/* Renewal info */}
                  <td className="p-4 font-mono text-slate-300">
                    {sub.status === 'trial' ? (
                      <div>
                        <p className="text-blue-400 font-semibold">Trial Exp: {formatDate(sub.trial_end)}</p>
                        <p className="text-[9px] text-slate-550">Trial Start: {formatDate(sub.trial_start)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-350">Renewal: {formatDate(sub.renewal_at)}</p>
                        {sub.expires_at && <p className="text-[9px] text-slate-550">Expires: {formatDate(sub.expires_at)}</p>}
                      </div>
                    )}
                  </td>

                  {/* Billing status */}
                  <td className="p-4 text-center">
                    <div>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                        sub.billing_status === 'paid'
                          ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                          : sub.billing_status === 'pending'
                          ? 'bg-amber-950/30 text-amber-400 border border-amber-900/30'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}>
                        {sub.billing_status}
                      </span>
                      {sub.latest_invoice_amount > 0 && (
                        <p className="text-[9px] text-slate-500 font-mono mt-1">{formatRupiah(sub.latest_invoice_amount)}</p>
                      )}
                    </div>
                  </td>

                  {/* Row Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openRenewalModal(sub)}
                        disabled={actionLoading}
                        className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all"
                        title="Ubah Masa Langganan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {sub.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelSub(sub.id, sub.business_name)}
                          disabled={actionLoading}
                          className="p-2 bg-rose-950/20 text-rose-450 border border-rose-950/30 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                          title="Batalkan Langganan"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Renewal Date Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-violet-400" />
                <h3 className="text-xs font-bold text-white">Ubah Masa Langganan</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-4">
              Ubah masa perpanjangan untuk merchant <span className="font-bold text-white">&ldquo;{targetBizName}&rdquo;</span>.
            </p>

            <form onSubmit={handleSaveRenewal} className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Tanggal Perpanjangan (Renewal At)</label>
                <input
                  required
                  type="date"
                  value={newRenewalDate}
                  onChange={(e) => setNewRenewalDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Tanggal Berakhir (Expires At - Opsional)</label>
                <input
                  type="date"
                  value={newExpiresDate}
                  onChange={(e) => setNewExpiresDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-350 hover:text-white font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-violet-650 hover:bg-violet-550 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
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
