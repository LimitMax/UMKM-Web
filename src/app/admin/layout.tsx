'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  ShoppingBag, 
  Layers, 
  History, 
  Brain, 
  Menu, 
  X, 
  Home, 
  Sparkles,
  LogOut,
  Settings,
  ClipboardList,
  ShieldAlert,
  Lock,
  Clock,
  CreditCard,
  AlertTriangle,
  Globe,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';
import RoleGuardBanner from '../../components/RoleGuardBanner';
import { getSubscriptionAccessState } from '../../lib/subscription/status';
import SubscriptionPaymentModal from '../../components/payments/SubscriptionPaymentModal';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user: supabaseUser, profile, currentBusiness, loading: authLoading, signOut, refreshAuth } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [signOut, router]);

  useEffect(() => {
    console.log('[AdminLayout] useEffect checking redirect: ' + JSON.stringify({
      pathname,
      authLoading,
      hasUser: !!supabaseUser,
      hasProfile: !!profile,
      role: profile?.role,
      bizStatus: currentBusiness?.status,
    }));
    if (!authLoading) {
      if (!supabaseUser) {
        console.log('[AdminLayout] Redirecting to login because user is missing');
        setTimeout(() => {
          setIsRedirecting(true);
          router.push('/login');
        }, 0);
      } else if (!profile) {
        console.log('[AdminLayout] Redirecting to onboarding/register because profile is missing');
        setTimeout(() => {
          setIsRedirecting(true);
          router.push('/register');
        }, 0);
      } else if (currentBusiness && currentBusiness.status === 'archived') {
        console.log('[AdminLayout] Redirecting to login because business is archived');
        setTimeout(() => {
          setIsRedirecting(true);
          handleLogout();
        }, 0);
      } else if (currentBusiness && currentBusiness.status === 'suspended') {
        console.log('[AdminLayout] Redirecting to suspended page');
        setTimeout(() => {
          setIsRedirecting(true);
          router.push('/suspended');
        }, 0);
      }
    }
  }, [supabaseUser, profile, authLoading, router, currentBusiness, handleLogout, pathname]);


  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-xs font-mono animate-pulse">Memverifikasi sesi admin...</div>
      </div>
    );
  }


  // Block: cashier trying to access admin layout
  if (profile && profile.role === 'cashier') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2 font-sans">Akses Terbatas</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans">
            Akun Anda terdaftar sebagai <span className="font-bold text-emerald-400">Kasir</span>. Halaman administrasi ini hanya diperuntukkan bagi Owner/Admin.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/cashier"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-xs font-sans block"
            >
              Ke Dashboard Kasir
            </Link>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white font-bold rounded-xl transition-all text-xs border border-slate-700 font-sans"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Block: platform_owner must NOT access business admin routes
  if (profile && profile.role === 'platform_owner') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2 font-sans">403 — Akses Ditolak</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans">
            Akun <span className="font-bold text-violet-400">Platform Owner</span> tidak dapat mengakses
            Dashboard Bisnis. Area ini hanya untuk Owner/Admin bisnis.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/platform/dashboard"
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-xs font-sans flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4" />
              Ke Platform Console
            </Link>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-xs border border-slate-700 font-sans"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentRole = profile?.role || 'admin';
  const isPlatformOwner = profile?.role === 'platform_owner' || currentBusiness?.id === 'biz-platform-owner';

  // --- Subscription Access State ---
  const subState = getSubscriptionAccessState({
    plan_code: currentBusiness?.plan_code,
    subscription_status: currentBusiness?.subscription_status,
    trial_ends_at: currentBusiness?.trial_ends_at,
  });

  // Feature lock: locked AND not on settings page (so they can always pay from settings)
  const isSettingsPage = pathname === '/admin/settings';
  const showFeatureLock = subState.isLocked && !isSettingsPage && !isPlatformOwner;

  let navItems = [
    { href: '/admin', label: 'Ringkasan', icon: BarChart3 },
    { href: '/admin/products', label: 'Kelola Produk', icon: ShoppingBag },
    { href: '/admin/stock', label: 'Kelola Stok', icon: Layers },
    { href: '/admin/transactions', label: 'Transaksi', icon: History },
    { href: '/admin/reports', label: 'Laporan', icon: ClipboardList },
    { href: '/admin/vouchers', label: 'Promo & Voucher', icon: Ticket },
    { href: '/admin/insights', label: 'AI Insights', icon: Brain },
    { href: '/admin/settings', label: 'Pengaturan Bisnis', icon: Settings },
  ];



  if (currentRole === 'cashier') {
    navItems = [
      { href: '/cashier', label: 'Dashboard Kasir', icon: BarChart3 },
      { href: '/admin/transactions', label: 'Struk Transaksi', icon: ClipboardList },
      { href: currentBusiness?.slug ? `/order/${currentBusiness.slug}` : '/order', label: 'Order Customer', icon: ShoppingBag },
    ];
  }

  // Display fields based on auth mode
  const displayName = profile?.full_name || 'Pemilik UMKM';
  const displayRole = profile?.role === 'admin' ? 'Pemilik/Admin' : 'Kasir';
  const displayBusiness = currentBusiness?.name || 'Bisnis UMKM';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      
      {/* Mobile Header Nav */}
      <header className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
            <Sparkles className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-sm text-white">
            UMKM Pilot <span className="text-[10px] font-mono text-emerald-400">Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-350 hover:text-white"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-[45] w-64 bg-slate-900 border-r border-slate-850 p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:z-10
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo Brand */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white">
                UMKM <span className="text-emerald-400">Pilot</span>
              </span>
              <span className="block text-[9px] text-emerald-400/80 font-mono tracking-widest uppercase">Admin Panel</span>
            </div>
          </div>

          {/* Subscription status pill in sidebar */}
          {subState.isTrialing && !subState.isTrialExpired && !isPlatformOwner && (
            <div className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-indigo-300 font-bold block">MASA TRIAL</span>
                <span className="text-[10px] text-indigo-200 font-semibold">
                  {subState.daysRemaining} hari tersisa
                </span>
              </div>
            </div>
          )}

          {subState.isLocked && !isPlatformOwner && (
            <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-rose-300 font-bold block">TRIAL HABIS</span>
                <span className="text-[10px] text-rose-200 font-semibold">Fitur dikunci</span>
              </div>
            </div>
          )}

          {/* Navigation links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isLockedItem = subState.isLocked && item.href !== '/admin/settings' && !isPlatformOwner;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative
                    ${isActive 
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                      : isLockedItem
                        ? 'text-slate-600 hover:text-slate-500 cursor-not-allowed'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
                  `}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {isLockedItem && !isActive && (
                    <Lock className="w-3 h-3 ml-auto text-slate-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer links */}
        <div className="flex flex-col gap-3 border-t border-slate-850 pt-6 mt-auto">
          {/* Display User Card Info */}
          <div className="px-4 py-2 bg-slate-950/40 border border-slate-850 rounded-xl mb-1.5 flex flex-col gap-0.5 leading-tight">
            <span className="text-[8px] font-mono text-slate-500 uppercase">Akses Aktif</span>
            <span className="text-[10px] font-bold text-white truncate">{displayName}</span>
            <span className="text-[9px] text-slate-400 truncate">{displayRole}</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-350 transition-all text-left font-sans"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Keluar Sesi</span>
          </button>
          
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-350 transition-all hover:bg-slate-800/30 font-sans"
          >
            <Home className="w-4.5 h-4.5" />
            <span>Ke Halaman Utama</span>
          </Link>
          
          <div className="text-[10px] text-slate-600 pl-4 font-mono truncate">
            Toko: {displayBusiness}
          </div>
        </div>
      </aside>

      {/* Overlay behind sidebar in mobile drawer mode */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-[35] md:hidden" 
        />
      )}

      {/* Main Content Pane */}
      <div className="flex-1 overflow-x-hidden flex flex-col">

        {/* ── Trial Countdown Banner ── */}
        {subState.isTrialing && !subState.isTrialExpired && subState.daysRemaining !== null && !isPlatformOwner && (
          <div className="bg-indigo-900/40 border-b border-indigo-500/20 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-indigo-200">
              <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="text-xs font-semibold">
                Masa trial Anda:{' '}
                <strong className="text-white">
                  {subState.daysRemaining === 0
                    ? 'berakhir hari ini!'
                    : `${subState.daysRemaining} hari tersisa`}
                </strong>
                {' '}— Paket <span className="font-bold capitalize text-indigo-100">{currentBusiness?.plan_code || 'Starter'}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer border-none flex-shrink-0"
            >
              <CreditCard className="w-3 h-3" />
              <span>Aktifkan Sekarang</span>
            </button>
          </div>
        )}

        {/* ── Trial Expired / Past Due Banner ── */}
        {subState.isLocked && !isPlatformOwner && (
          <div className="bg-rose-900/30 border-b border-rose-500/25 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="text-xs font-semibold">
                Masa trial telah berakhir.{' '}
                <strong className="text-white">Semua fitur dikunci</strong>
                {' '}— lakukan pembayaran untuk membuka kembali akses penuh.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer border-none flex-shrink-0"
            >
              <CreditCard className="w-3 h-3" />
              <span>Bayar Sekarang</span>
            </button>
          </div>
        )}

        <div className="flex-1 p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <RoleGuardBanner allowedRoles={['admin']} currentPageName="Owner/Admin Dashboard" />

            {/* ── Feature Lock Screen (shown when locked and NOT on settings page) ── */}
            {showFeatureLock ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-16">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full shadow-2xl flex flex-col items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-rose-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white mb-2">Fitur Terkunci</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Masa trial gratis 7 hari untuk paket{' '}
                      <strong className="text-white capitalize">{currentBusiness?.plan_code || 'Starter'}</strong>{' '}
                      Anda telah berakhir. Lakukan pembayaran untuk membuka kembali semua fitur.
                    </p>
                  </div>

                  <div className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2 text-xs text-left">
                    <p className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider mb-2">Yang Anda Dapatkan:</p>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span> Akses penuh semua menu admin
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span> Kelola produk, stok, dan transaksi
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span> Laporan dan ekspor data
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span> Pembayaran online Midtrans
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(true)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Bayar Langganan Sekarang</span>
                    </button>
                    <Link
                      href="/admin/settings"
                      className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all text-center"
                    >
                      Ke Pengaturan
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>

      {/* Subscription Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        businessId={currentBusiness?.id || ''}
        currentPlanCode={currentBusiness?.plan_code}
        subscriptionStatus={currentBusiness?.subscription_status}
        trialEndsAt={currentBusiness?.trial_ends_at}
        onPaymentSuccess={async () => {
          setPaymentModalOpen(false);
          await refreshAuth();
        }}
      />
    </div>
  );
}
