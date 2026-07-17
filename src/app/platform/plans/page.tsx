'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings,
  Archive,
  X,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';

interface PlanRow {
  id: string;
  code: string;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'annual';
  trial_days: number;
  description: string | null;
  status: 'active' | 'archived';
  is_active: boolean;
  product_limit: number;
  sort_order: number;
  created_at: string;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PlatformPlansPage() {
  const { user: supabaseUser } = useAuth();

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  
  // Form Values
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [trialDays, setTrialDays] = useState<number>(7);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [productLimit, setProductLimit] = useState<number>(100);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/platform/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat paket langganan.');
      }

      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadPlans();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadPlans]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setPrice(0);
    setBillingCycle('monthly');
    setTrialDays(7);
    setDescription('');
    setStatus('active');
    setProductLimit(100);
    setModalOpen(true);
  };

  const openEditModal = (plan: PlanRow) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price);
    setBillingCycle(plan.billing_cycle || 'monthly');
    setTrialDays(plan.trial_days || 0);
    setDescription(plan.description || '');
    setStatus(plan.status || 'active');
    setProductLimit(plan.product_limit || 100);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const url = editingPlan ? `/api/platform/plans/${editingPlan.id}` : '/api/platform/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          billing_cycle: billingCycle,
          trial_days: Number(trialDays),
          description,
          status,
          product_limit: Number(productLimit)
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal menyimpan paket.');
      }

      setSuccessMsg(editingPlan ? 'Paket berhasil diperbarui.' : 'Paket baru berhasil dibuat.');
      setModalOpen(false);
      await loadPlans();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (id: string, planName: string) => {
    if (!window.confirm(`Arsipkan paket langganan "${planName}"? Paket ini tidak akan bisa dipilih oleh tenant baru.`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(resData.message || 'Gagal mengarsipkan paket.');
      }

      setSuccessMsg('Paket berhasil diarsipkan.');
      await loadPlans();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Memuat paket langganan...</span>
      </div>
    );
  }

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
          <h1 className="text-2xl font-black text-white tracking-tight">Manajemen Paket Plan</h1>
          <p className="text-xs text-slate-400 mt-0.5">Kelola penawaran harga, masa uji coba gratis, dan limit fitur merchant SaaS.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-violet-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Plan Baru</span>
        </button>
      </div>

      {/* Alert Notices */}
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

      {/* Grid of Plans */}
      {plans.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
          <Award className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-bold text-sm">Belum ada plan terdaftar</p>
          <p className="text-slate-550 text-[11px] mt-1">Gunakan tombol &ldquo;Buat Plan Baru&rdquo; untuk menambahkan opsi paket langganan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`glass rounded-3xl border p-6 flex flex-col justify-between relative transition-all ${
                p.status === 'archived'
                  ? 'border-slate-900 bg-slate-950/40 opacity-70'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/20'
              }`}
            >
              {/* Plan Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border uppercase tracking-wider ${
                    p.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    {p.status === 'active' ? 'Active' : 'Archived'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Code: {p.code}</span>
                </div>

                <h3 className="text-lg font-black text-white">{p.name}</h3>
                <p className="text-[11px] text-slate-450 mt-1 leading-relaxed min-h-[36px]">{p.description || 'Tidak ada deskripsi.'}</p>
                
                {/* Plan Pricing */}
                <div className="my-5 pb-4 border-b border-slate-850">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">{formatRupiah(p.price)}</span>
                    <span className="text-slate-500 text-xs font-medium">/ {p.billing_cycle === 'annual' ? 'tahun' : 'bulan'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Trial gratis: {p.trial_days} hari</p>
                </div>

                {/* Plan Features limits */}
                <div className="space-y-2.5 text-xs pb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-450">Limit Produk:</span>
                    <span className="font-mono text-white font-semibold">
                      {p.product_limit === -1 || p.product_limit > 10000 ? 'Unlimited' : `${p.product_limit} produk`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-450">Sistem POS & Kasir:</span>
                    <span className="text-white font-semibold">Aktif</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-450">Integrasi Midtrans:</span>
                    <span className="text-white font-semibold">Aktif</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-450">Layanan AI Insights:</span>
                    <span className="text-white font-semibold">Aktif</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-850">
                <button
                  onClick={() => openEditModal(p)}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Edit Plan</span>
                </button>
                {p.status === 'active' && (
                  <button
                    onClick={() => handleArchive(p.id, p.name)}
                    disabled={actionLoading}
                    className="p-2 bg-rose-950/20 text-rose-400 border border-rose-950/40 hover:bg-rose-900/20 hover:text-white rounded-xl transition-all"
                    title="Arsipkan Plan"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-850 mb-5">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-violet-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingPlan ? `Edit Paket "${editingPlan.name}"` : 'Buat Paket Langganan Baru'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Nama Paket</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Growth, Enterprise"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Harga (Rupiah)</label>
                  <input
                    required
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="Contoh: 199000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Siklus Penagihan</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="monthly">Bulanan (Monthly)</option>
                    <option value="annual">Tahunan (Annual)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Uji Coba (Hari)</label>
                  <input
                    type="number"
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    placeholder="Contoh: 7"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Limit Menu Produk</label>
                  <input
                    type="number"
                    value={productLimit}
                    onChange={(e) => setProductLimit(Number(e.target.value))}
                    placeholder="Contoh: 100"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan kelebihan paket ini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {editingPlan && (
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'archived')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-350 hover:text-white font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-violet-650 hover:bg-violet-550 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Simpan Paket</span>
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
