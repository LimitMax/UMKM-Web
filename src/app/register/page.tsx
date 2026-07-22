'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  User, 
  Mail, 
  Briefcase, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Check,
  CheckCircle,
  Building2,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';
import { BillingCycleToggle } from '../../components/payments/BillingCycleToggle';
import { supabaseClient } from '../../lib/supabase/client';
import { profileService } from '../../lib/services/profileService';
import { generateBusinessSlug, slugifyBusinessName } from '../../lib/utils/slug';
import { getTrialEndDate, normalizeOwnerEmail, TRIAL_DAYS } from '../../lib/subscription/status';

type RegistrationPlanCode = 'starter' | 'pro';

export default function RegisterPage() {
  const router = useRouter();
  const { isSupabaseConfigured, refreshAuth } = useAuth();
  
  // Wizard Step: 1 = Pilih Paket, 2 = Akun Owner, 3 = Profil Bisnis
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Package Plan Selection
  const [planCode, setPlanCode] = useState<RegistrationPlanCode>('starter');

  // Step 2: Owner Account
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Business Profile
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Kedai Kopi & Makanan');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  // Billing and Promo states
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  
  // System states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdOrderUrl, setCreatedOrderUrl] = useState('');

  const businessCategoryOptions = [
    'Kedai Kopi & Makanan',
    'Laundry',
    'Toko Kelontong',
    'Rumah Makan',
    'Jasa / Dagang Lainnya',
    'Lainnya',
  ];

  const getFinalBusinessType = () => {
    return businessType === 'Lainnya' ? customBusinessType.trim() : businessType;
  };

  const createUniqueSlug = async (name: string) => {
    const baseSlug = slugifyBusinessName(name) || 'bisnis';
    let candidate = baseSlug;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data } = await supabaseClient
        .from('businesses')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (!data) return candidate;
      candidate = generateBusinessSlug(name);
    }
    return generateBusinessSlug(name);
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

  const getPlanBasePrice = (code: 'starter' | 'pro') => {
    if (code === 'starter') {
      return billingCycle === 'annual' ? 1089000 : 99000;
    }
    return billingCycle === 'annual' ? 2189000 : 199000;
  };

  const calculateDiscount = (basePrice: number) => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.round((basePrice * appliedCoupon.discountValue) / 100);
    }
    return appliedCoupon.discountValue;
  };

  const getPlanFinalPrice = (code: 'starter' | 'pro') => {
    const base = getPlanBasePrice(code);
    const disc = calculateDiscount(base);
    return Math.max(0, base - disc);
  };

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const nextStep = () => {
    setErrorMsg('');
    if (step === 2) {
      if (!ownerName || !email || !password || !confirmPassword) {
        setErrorMsg('Semua kolom wajib diisi pada langkah ini.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Kata sandi harus minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Konfirmasi kata sandi tidak cocok.');
        return;
      }
    }
    setStep((prev) => (prev + 1) as 1 | 2 | 3);
  };

  const prevStep = () => {
    setErrorMsg('');
    setStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!businessName) {
      setErrorMsg('Nama Bisnis wajib diisi.');
      return;
    }
    const finalBusinessType = getFinalBusinessType();
    if (!finalBusinessType) {
      setErrorMsg('Kategori Usaha Lainnya wajib diisi.');
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase tidak dikonfigurasi. Registrasi tidak dapat diproses.');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = normalizeOwnerEmail(email);
      const { data: previousTrialRows, error: trialCheckError } = await supabaseClient
        .from('business_subscriptions')
        .select('id')
        .eq('owner_email', normalizedEmail)
        .not('trial_ends_at', 'is', null)
        .limit(1);

      if (trialCheckError) {
        throw trialCheckError;
      }

      const canStartTrial = !previousTrialRows || previousTrialRows.length === 0;
      const trialEndsAt = canStartTrial ? getTrialEndDate().toISOString() : null;
      const subscriptionStatus = canStartTrial ? 'trialing' : 'past_due';

      // 1. Sign up the owner via Supabase Auth
      const { data: authData, error: signUpError } = await supabaseClient.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: ownerName,
          },
        },
      });

      if (signUpError) throw signUpError;

      const user = authData.user;
      if (!user) {
        throw new Error('Pendaftaran akun gagal. Silakan coba kembali.');
      }

      // 2. Generate a custom business ID
      const businessId = 'biz-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const slug = await createUniqueSlug(businessName);

      // 3. Create the business row in Supabase
      const trialEndsAtIso = trialEndsAt;
      const { error: bizInsertError } = await supabaseClient
        .from('businesses')
        .insert([
          {
            id: businessId,
            name: businessName,
            business_type: finalBusinessType,
            slug,
            public_order_enabled: true,
            address: businessAddress || null,
            whatsapp_number: whatsappNumber || null,
            plan_code: planCode,
            subscription_status: subscriptionStatus,
            trial_ends_at: trialEndsAtIso,
            delivery_settings: {},
            eta_settings: {}
          },
        ]);

      if (bizInsertError) throw bizInsertError;

      // 4. Create user profile in profiles table
      await profileService.createProfileForUser(user.id, businessId, ownerName, email, 'admin');

      // 5. Fetch the selected plan to link subscription
      const { data: planData } = await supabaseClient
        .from('plans')
        .select('id')
        .eq('code', planCode)
        .maybeSingle();

      // 6. Create the business subscription record (with owner_email for email-based trial tracking)
      if (planData) {
        const { error: subError } = await supabaseClient
          .from('business_subscriptions')
          .insert([
            {
              business_id: businessId,
              plan_id: planData.id,
              owner_email: normalizedEmail,
              status: subscriptionStatus,
              billing_cycle: billingCycle,
              coupon_code: appliedCoupon ? appliedCoupon.code : null,
              started_at: new Date().toISOString(),
              trial_ends_at: trialEndsAtIso,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ]);

        if (subError) {
          console.error('Error creating business subscription record:', subError);
        }
      }

      await refreshAuth();

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const orderUrl = `${origin}/order/${slug}`;
      setCreatedOrderUrl(orderUrl);

      const trialMsg = canStartTrial
        ? `Masa trial gratis ${TRIAL_DAYS} hari dimulai sekarang.`
        : 'Email ini sudah pernah digunakan untuk trial. Anda akan diarahkan ke halaman pembayaran.';
      setSuccessMsg(`Registrasi UMKM baru berhasil! ${trialMsg} Mengalihkan ke Dashboard...`);
      
      setTimeout(() => {
        router.push('/admin/settings');
      }, 1800);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Pendaftaran gagal.');
      setIsLoading(false);
    }
  };

  const packagePlans = [
    {
      code: 'starter' as const,
      name: 'Starter',
      price: 'Rp 99.000',
      period: '/ bulan',
      desc: 'Untuk UMKM kecil yang mulai aktif berjualan online',
      features: [
        'Hingga 100 Produk',
        'Pesanan Unlimited ✅',
        'Maksimal 3 Akun Staf/Kasir',
        'Analisis AI Insights ❌',
        'Pembayaran Online (Midtrans) ✅',
        'Ekspor Laporan (Excel/PDF) ❌',
      ],
      borderClass: 'border-slate-800 hover:border-indigo-700',
      activeClass: 'border-indigo-500 bg-indigo-950/10 shadow-lg shadow-indigo-500/5',
      trialBadge: true,
    },
    {
      code: 'pro' as const,
      name: 'Pro',
      price: 'Rp 199.000',
      period: '/ bulan',
      desc: 'Untuk UMKM yang butuh insight AI, laporan dan optimasi lengkap',
      features: [
        'Hingga 500 Produk',
        'Pesanan Unlimited ✅',
        'Maksimal 10 Akun Staf/Kasir',
        'Analisis AI Insights ✅',
        'Pembayaran Online (Midtrans) ✅',
        'Ekspor Laporan (Excel/PDF) ✅',
      ],
      borderClass: 'border-slate-800 hover:border-teal-700',
      activeClass: 'border-teal-500 bg-teal-950/10 shadow-lg shadow-teal-500/5',
      badge: 'Paling Populer',
      trialBadge: true,
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black px-4 py-12 relative overflow-hidden">
      
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className={`w-full flex flex-col gap-6 relative z-10 ${step === 1 ? 'max-w-3xl' : 'max-w-md'}`}>
        
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-3">
              UMKM <span className="text-emerald-400">Pilot</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Daftarkan bisnis baru Anda di platform digital UMKM Pilot</p>
          </div>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex justify-center items-center gap-2.5 max-w-sm mx-auto w-full px-4 mb-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
              step >= 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              1
            </div>
            <span className={`text-[10px] font-bold ${step >= 1 ? 'text-white' : 'text-slate-500'}`}>Paket</span>
          </div>
          <div className={`flex-1 h-[2px] ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
              step >= 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              2
            </div>
            <span className={`text-[10px] font-bold ${step >= 2 ? 'text-white' : 'text-slate-500'}`}>Owner</span>
          </div>
          <div className={`flex-1 h-[2px] ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
              step >= 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              3
            </div>
            <span className={`text-[10px] font-bold ${step >= 3 ? 'text-white' : 'text-slate-500'}`}>Bisnis</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass rounded-3xl p-6 md:p-8 border border-slate-800/80 shadow-2xl">
          
          {/* STEP 1: PILIH PAKET */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center md:text-left">
                <h2 className="text-lg font-bold text-white">Langkah 1: Pilih Paket Langganan</h2>
                <p className="text-xs text-slate-400 mt-1">Sesuaikan fitur dan limitasi sistem dengan kebutuhan usaha Anda.</p>
              </div>

              {/* 7-day trial info */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-[11px] leading-relaxed font-semibold flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-indigo-100 font-black">Trial Gratis {TRIAL_DAYS} Hari</span> untuk semua paket berbayar —{' '}
                  tanpa kartu kredit, cukup daftar dan mulai gunakan semua fitur. Setelah trial berakhir, lakukan pembayaran untuk melanjutkan.
                </div>
              </div>

              {/* Billing Cycle Toggle */}
              <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {packagePlans.map((plan) => {
                  const isActive = planCode === plan.code;
                  const originalPrice = getPlanBasePrice(plan.code);
                  const finalPrice = getPlanFinalPrice(plan.code);
                  const hasDiscount = appliedCoupon !== null;
                  return (
                    <div
                      key={plan.code}
                      onClick={() => setPlanCode(plan.code)}
                      className={`relative rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                        isActive ? plan.activeClass : plan.borderClass
                      }`}
                    >
                      {/* Top badges */}
                      <div className="absolute -top-2.5 left-0 right-0 flex justify-between px-4">
                        {plan.trialBadge && (
                          <span className="bg-indigo-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {TRIAL_DAYS} Hari Gratis
                          </span>
                        )}
                        {plan.badge && (
                          <span className="bg-teal-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ml-auto">
                            {plan.badge}
                          </span>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{plan.desc}</p>
                          </div>
                          <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            isActive ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700'
                          }`}>
                            {isActive && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="border-t border-b border-slate-800/80 py-2.5 flex items-baseline gap-1">
                          {hasDiscount && (
                            <span className="text-xs text-slate-500 line-through mr-1">
                              {formatRupiah(originalPrice)}
                            </span>
                          )}
                          <span className="text-xl font-black text-white">{formatRupiah(finalPrice)}</span>
                          <span className="text-[10px] text-slate-500">/ {billingCycle === 'annual' ? 'tahun' : 'bulan'}</span>
                        </div>

                        <ul className="space-y-2">
                          {plan.features.map((f, idx) => {
                            const isNo = f.includes('❌');
                            return (
                              <li key={idx} className="flex items-start gap-2 text-[10.5px]">
                                <span className={isNo ? 'text-slate-600' : 'text-emerald-400'}>
                                  {isNo ? '•' : '✓'}
                                </span>
                                <span className={isNo ? 'text-slate-500 line-through' : 'text-slate-300'}>
                                  {f.replace('❌', '').replace('✅', '')}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Code Input */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2.5">
                <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">KODE KUPON PROMO</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Masukkan kode kupon jika ada"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={isValidatingCoupon}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-55 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center justify-center min-w-[90px]"
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

              <div className="flex justify-end pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={nextStep}
                  className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-xs flex items-center gap-2 cursor-pointer border-none"
                >
                  <span>Lanjutkan ke Akun Owner</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BUAT AKUN OWNER */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Langkah 2: Buat Akun Owner</h2>
                <p className="text-xs text-slate-400 mt-1">Gunakan alamat email aktif Anda untuk bertindak sebagai Administrator Bisnis.</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Nama Owner */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Lengkap Owner *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Nama lengkap pemilik usaha"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Alamat Email *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@domain.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Kata Sandi *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Konfirmasi Kata Sandi *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi Anda"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white font-bold rounded-xl transition-all border border-slate-800 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-xs flex items-center gap-2 cursor-pointer border-none"
                >
                  <span>Lanjutkan ke Profil Bisnis</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROFIL BISNIS */}
          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Langkah 3: Detail Profil Bisnis</h2>
                <p className="text-xs text-slate-400 mt-1">Konfigurasikan entitas usaha Anda untuk memisahkan inventory dan data transaksi.</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Nama Bisnis */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Bisnis / Toko *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Nama UMKM Anda"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>

                {/* Jenis Bisnis */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Kategori Usaha *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer font-sans"
                    >
                      {businessCategoryOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="fill-current h-4 w-4 text-slate-500" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                {businessType === 'Lainnya' && (
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Kategori Usaha Lainnya *</label>
                    <input
                      type="text"
                      required
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      placeholder="Contoh: Barbershop, Bengkel Motor, Katering Rumahan"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                )}

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nomor WhatsApp (Opsional)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Format: 0812xxxxxxxx atau 62812xxxxxxxx"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>

                {/* Alamat Bisnis */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Alamat Fisik (Opsional)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <textarea
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="Alamat toko atau lokasi pusat operasional"
                      rows={2}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                  </div>
                  {createdOrderUrl && (
                    <span className="font-mono text-[10px] text-emerald-300 break-all">
                      {createdOrderUrl}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 gap-4">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={prevStep}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white font-bold rounded-xl transition-all border border-slate-800 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-emerald-950 disabled:to-teal-950 text-slate-950 disabled:text-slate-500 font-black rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  {isLoading ? (
                    <span>Mempersiapkan Sistem...</span>
                  ) : (
                    <>
                      <span>Selesaikan Pendaftaran</span>
                      <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        <div className="text-center text-xs text-slate-500">
          <span>Sudah memiliki akun? </span>
          <Link href="/login" className="text-emerald-400 hover:underline font-bold">
            Masuk Sekarang
          </Link>
        </div>

      </div>
    </div>
  );
}
