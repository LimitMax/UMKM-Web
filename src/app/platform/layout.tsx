'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Menu,
  X,
  Home,
  ShieldCheck,
  LogOut,
  ShieldAlert,
  CreditCard,
  Award,
  BarChart3,
  Activity,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';

const navItems = [
  { href: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/platform/businesses', label: 'Manajemen Bisnis', icon: Building2 },
  { href: '/platform/subscriptions', label: 'Daftar Langganan', icon: CreditCard },
  { href: '/platform/plans', label: 'Paket Langganan', icon: Award },
  { href: '/platform/coupons', label: 'Kupon & Promo', icon: Tag },
  { href: '/platform/analytics', label: 'Analisis Global', icon: BarChart3 },
  { href: '/platform/monitoring', label: 'Status Layanan', icon: Activity },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user: supabaseUser, profile, loading: authLoading, signOut } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (pathname === '/platform/login') return;
    if (!authLoading) {
      if (!supabaseUser) {
        setTimeout(() => {
          setIsRedirecting(true);
          router.push('/platform/login');
        }, 0);
      } else if (!profile) {
        setTimeout(() => {
          setIsRedirecting(true);
          router.push('/register');
        }, 0);
      }
    }
  }, [supabaseUser, profile, authLoading, router, pathname]);

  const handleLogout = async () => {
    await signOut();
    router.push('/platform/login');
  };

  // If on login page, skip layout wrappers and verify routines
  if (pathname === '/platform/login') {
    return <>{children}</>;
  }

  // ── Loading / redirecting state ──────────────────────────────────────────
  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-xs font-mono animate-pulse">
          Memverifikasi sesi Platform Owner...
        </div>
      </div>
    );
  }

  // ── 403: Business user trying to access Platform routes ──────────────────
  if (profile && profile.role !== 'platform_owner') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2 font-sans">403 — Akses Ditolak</h1>
          <p className="text-xs text-slate-400 mb-1 leading-relaxed font-sans">
            Halaman ini hanya dapat diakses oleh{' '}
            <span className="font-bold text-violet-400">Platform Owner</span>.
          </p>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed font-sans">
            Akun Anda terdaftar sebagai <span className="font-bold text-white capitalize">{profile.role}</span>.
            Anda tidak memiliki izin untuk mengakses area Platform Console.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/admin"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-xs font-sans block"
            >
              Ke Dashboard Bisnis
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

  const displayName = profile?.full_name || 'Platform Owner';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">

      {/* Mobile Header Nav */}
      <header className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-sm text-white">
            Platform <span className="text-[10px] font-mono text-violet-400">Console</span>
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-[45] w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:z-10
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo Brand */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/10">
              <ShieldCheck className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white">
                Platform <span className="text-violet-400">Console</span>
              </span>
              <span className="block text-[9px] text-violet-400/80 font-mono tracking-widest uppercase">
                UMKM Pilot · Owner Portal
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                    ${isActive
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer links */}
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-6 mt-auto">
          {/* User info card */}
          <div className="px-4 py-2 bg-slate-950/40 border border-slate-800 rounded-xl mb-1.5 flex flex-col gap-0.5 leading-tight">
            <span className="text-[8px] font-mono text-slate-500 uppercase">Akses Aktif</span>
            <span className="text-[10px] font-bold text-white truncate">{displayName}</span>
            <span className="text-[9px] text-violet-400 truncate font-mono">platform_owner</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all text-left font-sans"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-300 transition-all hover:bg-slate-800/30 font-sans"
          >
            <Home className="w-4 h-4" />
            <span>Ke Halaman Utama</span>
          </Link>
        </div>
      </aside>

      {/* Overlay behind sidebar on mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-[35] md:hidden"
        />
      )}

      {/* Main Content Pane */}
      <div className="flex-1 overflow-x-hidden flex flex-col">
        <div className="flex-1 p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
