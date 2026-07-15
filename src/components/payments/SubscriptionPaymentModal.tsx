'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Award,
  Zap,
  Check,
  AlertCircle,
  Loader2,
  CreditCard,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { supabaseClient } from '../../lib/supabase/client';
import { Plan } from '../../types';
import { BillingCycleToggle } from './BillingCycleToggle';

// Extend window for Midtrans Snap JS SDK
type SnapCallbacks = {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapCallbacks) => void;
    };
  }
}

interface SubscriptionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  currentPlanCode?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  onPaymentSuccess?: () => void;
}

type ModalStep = 'select_plan' | 'processing' | 'success' | 'error';

export default function SubscriptionPaymentModal({
  isOpen,
  onClose,
  businessId,
  currentPlanCode,
  subscriptionStatus,
  trialEndsAt,
  onPaymentSuccess,
}: SubscriptionPaymentModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
  const [step, setStep] = useState<ModalStep>('select_plan');
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [snapScriptLoaded, setSnapScriptLoaded] = useState(false);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
  const snapJsUrl = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';

  // Load Midtrans Snap script
  useEffect(() => {
    if (!isOpen) return;

    // If snap is already available, signal loaded via a microtask (avoids setState-in-effect-body)
    if (window.snap) {
      const t = setTimeout(() => setSnapScriptLoaded(true), 0);
      return () => clearTimeout(t);
    }

    const existingScript = document.getElementById('midtrans-snap-js');
    if (existingScript) {
      const handler = () => setSnapScriptLoaded(true);
      existingScript.addEventListener('load', handler);
      return () => existingScript.removeEventListener('load', handler);
    }

    const script = document.createElement('script');
    script.id = 'midtrans-snap-js';
    script.src = snapJsUrl;
    script.setAttribute('data-client-key', clientKey);
    const onLoad = () => setSnapScriptLoaded(true);
    script.addEventListener('load', onLoad);
    document.body.appendChild(script);
    return () => script.removeEventListener('load', onLoad);
  }, [isOpen, snapJsUrl, clientKey]);

  // Load paid plans (exclude free)
  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const { data, error } = await supabaseClient
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .gt('price_monthly', 0)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const mapped: Plan[] = (data || []).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        priceMonthly: row.price_monthly,
        priceAnnual: row.price_annual || 0,
        productLimit: row.product_limit,
        orderLimitMonthly: row.order_limit_monthly,
        cashierLimit: row.cashier_limit,
        aiEnabled: row.ai_enabled,
        midtransEnabled: row.midtrans_enabled,
        reportExportEnabled: row.report_export_enabled,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setPlans(mapped);

      // Pre-select current plan if it's paid, otherwise select first
      const activePaidPlan = mapped.find((p) => p.code === currentPlanCode);
      setSelectedPlanCode(activePaidPlan?.code || mapped[0]?.code || '');
    } catch (e) {
      console.error('[SubscriptionPaymentModal] Failed to load plans:', e);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [currentPlanCode]);

  useEffect(() => {
    if (!isOpen) return;
    // Schedule all state updates asynchronously to avoid calling setState
    // (directly or indirectly) synchronously within an effect body.
    const t1 = setTimeout(() => setStep('select_plan'), 0);
    const t2 = setTimeout(() => setErrorMsg(''), 0);
    const t3 = setTimeout(() => loadPlans(), 0);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, loadPlans]);

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const handlePay = async () => {
    if (!selectedPlanCode || !businessId) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      // First update the business plan_code to match selection
      await supabaseClient
        .from('businesses')
        .update({ plan_code: selectedPlanCode })
        .eq('id', businessId);

      // Get auth token
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      // Create Midtrans Snap transaction
      const res = await fetch('/api/subscriptions/midtrans/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          businessId,
          billingCycle,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal membuat transaksi pembayaran.');
      }

      const { snapToken, redirectUrl } = await res.json();

      // Open Midtrans Snap
      if (window.snap && snapToken) {
        setIsProcessing(false);
        window.snap.pay(snapToken, {
          onSuccess: () => {
            setStep('success');
            onPaymentSuccess?.();
          },
          onPending: () => {
            setStep('success');
            onPaymentSuccess?.();
          },
          onError: () => {
            setErrorMsg('Pembayaran gagal. Silakan coba lagi atau gunakan metode pembayaran lain.');
            setStep('error');
          },
          onClose: () => {
            // User closed the payment window without completing
            setIsProcessing(false);
          },
        });
      } else if (redirectUrl) {
        // Fallback: redirect to Midtrans hosted page
        window.open(redirectUrl, '_blank');
        setIsProcessing(false);
      } else {
        throw new Error('Snap token tidak tersedia. Pastikan konfigurasi Midtrans sudah benar.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem pembayaran.');
      setStep('error');
      setIsProcessing(false);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    setAppliedCoupon(null);
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const res = await fetch('/api/public/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.message || 'Kode kupon tidak valid.');
      } else {
        setAppliedCoupon(data.coupon);
      }
    } catch {
      setCouponError('Gagal memvalidasi kupon.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const getPlanBasePrice = (plan: Plan) => {
    return billingCycle === 'annual' ? (plan.priceAnnual || 0) : plan.priceMonthly;
  };

  const calculateDiscount = (basePrice: number) => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.round((basePrice * appliedCoupon.discountValue) / 100);
    }
    return appliedCoupon.discountValue;
  };

  const getPlanFinalPrice = (plan: Plan) => {
    const base = getPlanBasePrice(plan);
    const disc = calculateDiscount(base);
    return Math.max(0, base - disc);
  };

  const handleRetry = () => {
    setStep('select_plan');
    setErrorMsg('');
  };

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode);
  // Compute trial expiry once — avoids calling impure Date.now() during JSX render
  const nowMs = trialEndsAt ? new Date(trialEndsAt).getTime() : 0;
  const isTrialExpired =
    subscriptionStatus === 'past_due' ||
    (subscriptionStatus === 'trialing' &&
      trialEndsAt &&
      nowMs <= new Date().getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Award className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {step === 'success' ? 'Pembayaran Berhasil!' : 'Aktifkan Paket Langganan'}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {step === 'success'
                  ? 'Terima kasih, bisnis Anda sudah aktif'
                  : 'Pilih paket dan lakukan pembayaran via Midtrans'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trial expired warning */}
        {isTrialExpired && step === 'select_plan' && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Masa trial Anda telah berakhir.</strong> Semua fitur terkunci
              hingga pembayaran berhasil. Lakukan pembayaran untuk membuka akses penuh paket pilihan Anda.
            </div>
          </div>
        )}

        {/* Step: Select Plan */}
        {step === 'select_plan' && (
          <>
            {/* Billing Cycle Toggle */}
            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />

            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-xs">Memuat paket tersedia...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map((plan) => {
                  const isSelected = selectedPlanCode === plan.code;
                  const isCurrent = plan.code === currentPlanCode && subscriptionStatus === 'active';
                  return (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => setSelectedPlanCode(plan.code)}
                      className={`relative w-full text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                        isSelected
                          ? plan.code === 'pro'
                            ? 'border-teal-500 bg-teal-950/15 shadow-teal-500/5'
                            : 'border-indigo-500 bg-indigo-950/15 shadow-indigo-500/5'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-2.5 left-4 bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Aktif
                        </span>
                      )}
                      {plan.code === 'pro' && (
                        <span className="absolute -top-2.5 right-4 bg-teal-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Paling Populer
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white">{plan.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed mb-2">{plan.description}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span className="text-[10px] text-slate-500">
                              {plan.productLimit} Produk • {plan.cashierLimit} Kasir
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {plan.aiEnabled ? '✓ AI Insights' : '✗ AI'}
                              {' '}•{' '}
                              {plan.reportExportEnabled ? '✓ Ekspor' : '✗ Ekspor'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-base font-black text-white">{formatRupiah(getPlanBasePrice(plan))}</span>
                            <span className="text-[9px] text-slate-500 block">/ {billingCycle === 'annual' ? 'tahun' : 'bulan'}</span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? plan.code === 'pro'
                                  ? 'border-teal-500 bg-teal-500'
                                  : 'border-indigo-500 bg-indigo-500'
                                : 'border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Coupon Code Input */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col gap-2">
              <label className="text-[9px] font-mono text-slate-500 uppercase">KODE KUPON PROMO</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Masukkan kode kupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={isValidatingCoupon || isProcessing}
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || isProcessing || !couponCode.trim()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-55 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
                >
                  {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Terapkan'}
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  ✓ Kupon diskon terpasang: Potongan{' '}
                  {appliedCoupon.discountType === 'percentage'
                    ? `${appliedCoupon.discountValue}%`
                    : formatRupiah(appliedCoupon.discountValue)}
                </p>
              )}
              {couponError && (
                <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  ✗ {couponError}
                </p>
              )}
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0" />
              <span>Pembayaran aman via Midtrans. Data kartu tidak disimpan di sistem kami.</span>
            </div>

            {/* Action */}
            <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-800/60">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">Total yang perlu dibayar:</span>
                <div className="text-right">
                  {appliedCoupon && selectedPlan && (
                    <span className="text-slate-500 text-[10px] line-through mr-2">
                      {formatRupiah(getPlanBasePrice(selectedPlan))}
                    </span>
                  )}
                  <span className="text-white font-black text-base">
                    {selectedPlan ? formatRupiah(getPlanFinalPrice(selectedPlan)) : '-'}
                    <span className="text-slate-500 text-[10px] font-normal"> / {billingCycle === 'annual' ? 'tahun' : 'bulan'}</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={isProcessing || !selectedPlanCode || isLoadingPlans || !snapScriptLoaded}
                onClick={handlePay}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-700 disabled:to-slate-700 text-white disabled:text-slate-500 font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer border-none disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : !snapScriptLoaded ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memuat Sistem Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Bayar Sekarang — {selectedPlan ? formatRupiah(getPlanFinalPrice(selectedPlan)) : '...'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer border-none"
              >
                Batal
              </button>
            </div>
          </>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Zap className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-black text-white mb-2">Pembayaran Dikonfirmasi!</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paket <strong className="text-white">{selectedPlan?.name}</strong> Anda sedang diaktifkan.
                Proses verifikasi biasanya selesai dalam beberapa detik.
              </p>
            </div>
            <div className="p-3.5 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 text-center">
              ✅ Semua fitur paket {selectedPlan?.name} kini aktif untuk bisnis Anda.
            </div>
            <button
              type="button"
              onClick={() => {
                onPaymentSuccess?.();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl transition-all cursor-pointer border-none"
            >
              Kembali ke Dashboard
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-black text-white mb-2">Pembayaran Gagal</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMsg || 'Terjadi kesalahan saat memproses pembayaran.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer border-none flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Coba Lagi</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer border-none"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
