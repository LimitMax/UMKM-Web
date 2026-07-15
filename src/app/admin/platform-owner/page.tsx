'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Save, 
  Plus, 
  Trash2, 
  Tag, 
  Coins, 
  Percent, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';

interface PlanRow {
  id: string;
  code: string;
  name: string;
  price_monthly: number;
  price_annual: number;
}

interface CouponRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  created_at: string;
}

export default function PlatformOwnerPage() {
  const { user: supabaseUser, loading: authLoading } = useAuth();
  
  // States
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  
  // Pricing Form Local state
  const [planPrices, setPlanPrices] = useState<Record<string, { monthly: number; annual: number }>>({});
  
  // Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponDiscountValue, setCouponDiscountValue] = useState(10);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  
  // Alert Status
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const DEVELOPER_EMAILS = (process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isDeveloperAccount = Boolean(
    supabaseUser?.email && DEVELOPER_EMAILS.includes(supabaseUser.email.toLowerCase())
  );

  // Load plans & coupons
  const loadData = useCallback(async () => {
    if (!isDeveloperAccount) return;
    
    setLoadingPlans(true);
    setLoadingCoupons(true);
    setErrorMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      // Fetch plans
      const plansRes = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
        
        // Populate local form price state
        const initialPrices: Record<string, { monthly: number; annual: number }> = {};
        (plansData.plans || []).forEach((p: PlanRow) => {
          initialPrices[p.id] = { monthly: p.price_monthly, annual: p.price_annual || 0 };
        });
        setPlanPrices(initialPrices);
      } else {
        throw new Error('Gagal memuat daftar harga sewa.');
      }

      // Fetch coupons
      const couponsRes = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (couponsRes.ok) {
        const couponsData = await couponsRes.json();
        setCoupons(couponsData.coupons || []);
      } else {
        throw new Error('Gagal memuat daftar kupon.');
      }

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan memuat data.');
    } finally {
      setLoadingPlans(false);
      setLoadingCoupons(false);
    }
  }, [isDeveloperAccount]);

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [authLoading, loadData]);

  const handleUpdatePrice = async (planId: string, code: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    const prices = planPrices[planId];
    if (!prices) return;

    setSavingPlanId(planId);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId,
          priceMonthly: prices.monthly,
          priceAnnual: prices.annual
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menyimpan harga baru.');
      }

      setSuccessMsg(`Harga paket ${code.toUpperCase()} berhasil diperbarui!`);
      // Reload plans
      const plansRes = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui harga.');
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!couponCode.trim()) {
      setErrorMsg('Kode kupon wajib diisi.');
      return;
    }

    setIsCreatingCoupon(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          discountType: couponDiscountType,
          discountValue: Number(couponDiscountValue)
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menambahkan kupon.');
      }

      setSuccessMsg('Kupon diskon baru berhasil dibuat!');
      setCouponCode('');
      setCouponDiscountValue(10);

      // Reload coupons
      const couponsRes = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (couponsRes.ok) {
        const couponsData = await couponsRes.json();
        setCoupons(couponsData.coupons || []);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat kupon.');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Hapus kupon ${code}?`)) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menghapus kupon.');
      }

      setSuccessMsg(`Kupon ${code} berhasil dihapus.`);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus kupon.');
    }
  };

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  // Authentication Loading Screen
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-xs text-slate-500 font-mono animate-pulse">Memverifikasi otoritas pemilik...</span>
      </div>
    );
  }

  // Non-Developer Block
  if (!isDeveloperAccount) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Akses Terbatas</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Halaman ini eksklusif untuk <span className="font-bold text-emerald-400">Pemilik Platform (Platform Owner)</span>. Akun Anda tidak memiliki hak akses yang diperlukan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              PLATFORM OWNER
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Portal Pemilik Platform</h1>
          <p className="text-xs text-slate-400 mt-1">Atur harga sewa paket langganan aplikasi dan kelola kupon diskon promo.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Sesi Pemilik Aktif</span>
        </div>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Section 1: Pricing Settings */}
        <div className="glass rounded-3xl border border-slate-800/80 p-5 flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Coins className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Harga Sewa Aplikasi</h2>
              <p className="text-[10px] text-slate-500">Sesuaikan harga bulanan dan tahunan untuk paket premium.</p>
            </div>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center items-center py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Memuat daftar paket...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Tidak ada paket langganan berbayar ditemukan.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {plans.map((plan) => {
                const isSaving = savingPlanId === plan.id;
                const formState = planPrices[plan.id] || { monthly: 0, annual: 0 };
                return (
                  <div key={plan.id} className="p-4 rounded-2xl border border-slate-850 bg-slate-950/40 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black text-white">{plan.name}</span>
                        <span className="text-[9px] text-slate-500 block">Plan Code: {plan.code}</span>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleUpdatePrice(plan.id, plan.code)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] rounded-lg transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Simpan</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono text-slate-500 uppercase">Tarif Bulanan (Monthly)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={formState.monthly}
                            onChange={(e) => setPlanPrices((prev) => ({
                              ...prev,
                              [plan.id]: { ...formState, monthly: Number(e.target.value) }
                            }))}
                            className="w-full pl-8 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono text-slate-500 uppercase">Tarif Tahunan (Annual)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={formState.annual}
                            onChange={(e) => setPlanPrices((prev) => ({
                              ...prev,
                              [plan.id]: { ...formState, annual: Number(e.target.value) }
                            }))}
                            className="w-full pl-8 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Coupon Codes Manager */}
        <div className="glass rounded-3xl border border-slate-800/80 p-5 flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Tag className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Kupon Diskon</h2>
              <p className="text-[10px] text-slate-500">Buat, kelola, dan terapkan kode diskon potongan harga.</p>
            </div>
          </div>

          {/* Coupon creation form */}
          <form onSubmit={handleCreateCoupon} className="p-4 rounded-2xl border border-slate-850 bg-slate-950/40 flex flex-col gap-4">
            <span className="text-xs font-bold text-white">Buat Kupon Baru</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-slate-500 uppercase">KODE KUPON</label>
                <input
                  type="text"
                  required
                  placeholder="MISAL: DISKON30"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-slate-500 uppercase">Tipe Diskon</label>
                <select
                  value={couponDiscountType}
                  onChange={(e) => {
                    const val = e.target.value as 'percentage' | 'fixed';
                    setCouponDiscountType(val);
                    setCouponDiscountValue(val === 'percentage' ? 10 : 50000);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Nominal Tetap (Rp)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[9px] font-mono text-slate-500 uppercase">
                  {couponDiscountType === 'percentage' ? 'Nilai Persentase (%)' : 'Nilai Nominal (Rp)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={couponDiscountType === 'percentage' ? 100 : undefined}
                  value={couponDiscountValue}
                  onChange={(e) => setCouponDiscountValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingCoupon}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {isCreatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Buat Kupon</span>
            </button>
          </form>

          {/* List Coupons */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-white">Daftar Kupon Aktif</span>
            {loadingCoupons ? (
              <div className="flex justify-center items-center py-8 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Memuat daftar kupon...</span>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-850 rounded-2xl text-slate-500 text-xs">
                Belum ada kupon yang dibuat.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="flex justify-between items-center p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold font-mono">
                        {coupon.discount_type === 'percentage' ? <Percent className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white font-mono tracking-wider">{coupon.code}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Potongan:{' '}
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}%`
                            : formatRupiah(coupon.discount_value)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                      className="p-2 text-rose-400 hover:bg-rose-950/25 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      title="Hapus Kupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
