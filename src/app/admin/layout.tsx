'use client';

import { useState, useEffect } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';
import RoleGuardBanner from '../../components/RoleGuardBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user: supabaseUser, profile, loading: authLoading, signOut } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!supabaseUser || !profile) {
        setTimeout(() => {
          setIsRedirecting(true);
          router.push('/login');
        }, 0);
      }
    }
  }, [supabaseUser, profile, authLoading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-xs font-mono animate-pulse">Memverifikasi sesi admin...</div>
      </div>
    );
  }

  // Double check: if user is logged in as cashier, block access to administrative layout children
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

  const currentRole = profile?.role || 'admin';

  let navItems = [
    { href: '/admin', label: 'Ringkasan', icon: BarChart3 },
    { href: '/admin/products', label: 'Kelola Produk', icon: ShoppingBag },
    { href: '/admin/stock', label: 'Kelola Stok', icon: Layers },
    { href: '/admin/transactions', label: 'Transaksi', icon: History },
    { href: '/admin/reports', label: 'Laporan', icon: ClipboardList },
    { href: '/admin/insights', label: 'AI Insights', icon: Brain },
    { href: '/admin/settings', label: 'Pengaturan Bisnis', icon: Settings },
  ];

  if (currentRole === 'cashier') {
    navItems = [
      { href: '/cashier', label: 'Dashboard Kasir', icon: BarChart3 },
      { href: '/admin/transactions', label: 'Struk Transaksi', icon: ClipboardList },
      { href: '/order', label: 'Order Customer', icon: ShoppingBag },
    ];
  }

  // Display fields based on auth mode
  const displayName = profile?.full_name || 'Pemilik UMKM';
  const displayRole = profile?.role === 'admin' ? 'Pemilik/Admin' : 'Kasir';
  const displayBusiness = 'Kopi & Cemilan Pilot';

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

          {/* Navigation links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                    ${isActive 
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
                  `}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{item.label}</span>
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
      <div className="flex-1 overflow-x-hidden p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <RoleGuardBanner allowedRoles={['admin']} currentPageName="Owner/Admin Dashboard" />
          {children}
        </div>
      </div>
      
    </div>
  );
}
