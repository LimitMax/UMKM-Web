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
  ShieldAlert,
  LogOut,
  Settings
} from 'lucide-react';
import { authService, UserProfile } from '../../services/authService';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
    } else {
      setTimeout(() => {
        setUser(currentUser);
        setIsLoading(false);
      }, 0);
    }
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/admin', label: 'Ringkasan', icon: BarChart3 },
    { href: '/admin/products', label: 'Kelola Produk', icon: ShoppingBag },
    { href: '/admin/stock', label: 'Kelola Stok', icon: Layers },
    { href: '/admin/transactions', label: 'Transaksi', icon: History },
    { href: '/admin/insights', label: 'AI Insights', icon: Brain },
    { href: '/admin/settings', label: 'Pengaturan Bisnis', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-550 text-xs font-mono animate-pulse">Memverifikasi sesi admin...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-550 text-xs font-mono animate-pulse">Mengalihkan ke halaman masuk...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-850 p-8 rounded-3xl flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Akses Ditolak</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Halaman Panel Owner hanya dapat diakses oleh pengguna dengan role <strong>Admin / Owner</strong>. Peran Anda saat ini adalah <strong>{user.role}</strong>.
          </p>
          <div className="flex gap-3 mt-2 w-full">
            <button
              onClick={handleLogout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all"
            >
              Keluar & Ganti Akun
            </button>
            <Link
              href="/cashier"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center"
            >
              Ke Dashboard Kasir
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      
      {/* Mobile Header Nav */}
      <header className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-sm text-white">
            UMKM Pilot <span className="text-[10px] font-mono text-emerald-400">Admin</span>
          </span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-[45] w-64 bg-slate-900 border-r border-slate-850 p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-10 h-full
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
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-450 hover:bg-rose-950/20 hover:text-rose-400 transition-all text-left"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Keluar Sesi</span>
          </button>
          
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-350 transition-all hover:bg-slate-800/30"
          >
            <Home className="w-4.5 h-4.5" />
            <span>Ke Halaman Utama</span>
          </Link>
          
          <div className="text-[10px] text-slate-600 pl-4 font-mono truncate">
            Toko: {user.businessName}
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
          {children}
        </div>
      </div>
      
    </div>
  );
}
