'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, X, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthProvider';
import Link from 'next/link';

interface RoleGuardBannerProps {
  allowedRoles: ('admin' | 'cashier' | 'customer')[];
  currentPageName: string;
}

export default function RoleGuardBanner({ allowedRoles, currentPageName }: RoleGuardBannerProps) {
  const { user, profile, role, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || loading || isDismissed) return null;

  // If not logged in, layout will redirect. We show nothing here.
  if (!user || !profile) return null;

  const activeRole = (role || profile.role) as 'admin' | 'cashier' | 'customer';
  
  // If role is allowed, do not show anything
  if (allowedRoles.includes(activeRole)) {
    return null;
  }

  const getRoleLabel = (r: 'admin' | 'cashier' | 'customer') => {
    if (r === 'admin') return 'Admin/Owner';
    if (r === 'cashier') return 'Kasir';
    return 'Pelanggan';
  };

  const roleLabel = getRoleLabel(activeRole);

  return (
    <div className="w-full no-print bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-slide-in mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 mt-0.5 md:mt-0 flex-shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-400 font-mono">Batasan Akses Halaman</h4>
          <p className="text-[11px] text-amber-200/80 leading-relaxed mt-1 font-sans">
            Akun Anda terdaftar sebagai <span className="font-bold text-white">{roleLabel}</span>. Halaman <span className="font-bold text-white">{currentPageName}</span> hanya dapat diakses oleh Admin/Owner.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
        {activeRole === 'cashier' && (
          <Link
            href="/cashier"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/5 font-sans"
          >
            <span>Ke Dashboard Kasir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          type="button"
          className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 font-sans"
        >
          <X className="w-3.5 h-3.5" />
          <span>Tutup</span>
        </button>
      </div>
    </div>
  );
}
