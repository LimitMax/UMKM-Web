'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, X, LogIn } from 'lucide-react';
import { demoRoleService } from '../services/demoRoleService';
import { useAuth } from './AuthProvider';
import Link from 'next/link';

interface RoleGuardBannerProps {
  allowedRoles: ('admin' | 'cashier' | 'customer')[];
  currentPageName: string;
}

export default function RoleGuardBanner({ allowedRoles, currentPageName }: RoleGuardBannerProps) {
  const { user, profile, role, isDemoMode, isSupabaseConfigured } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || isDismissed) return null;

  const getRoleLabel = (r: 'admin' | 'cashier' | 'customer') => {
    if (r === 'admin') return 'Admin/Owner';
    if (r === 'cashier') return 'Kasir';
    return 'Pelanggan';
  };

  // Case 1: Logged in via Supabase
  if (!isDemoMode && user && profile) {
    const activeRole = (role || profile.role) as 'admin' | 'cashier' | 'customer';
    if (allowedRoles.includes(activeRole)) {
      return null;
    }

    const roleLabel = getRoleLabel(activeRole);
    const targetLabel = allowedRoles.map(r => getRoleLabel(r)).join(' atau ');

    return (
      <div className="w-full no-print bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-slide-in mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 mt-0.5 md:mt-0 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-400">Batasan Akses Akun</h4>
            <p className="text-[11px] text-amber-200/80 leading-relaxed mt-1 font-sans">
              Akun Anda adalah {roleLabel}. Halaman {currentPageName} biasanya digunakan oleh {targetLabel}.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          type="button"
          className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          <span>Lanjutkan</span>
        </button>
      </div>
    );
  }

  // Case 2: Not logged in / Demo Mode
  const currentDemoRole = demoRoleService.getCurrentDemoRole() as 'admin' | 'cashier' | 'customer';
  const isDemoRoleAllowed = allowedRoles.includes(currentDemoRole);

  if (isDemoRoleAllowed) {
    // Demo role matches, but if Supabase is configured, show a reminder
    if (isSupabaseConfigured) {
      return (
        <div className="w-full no-print bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-slide-in mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400 mt-0.5 md:mt-0 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-400">Mode Demo Aktif</h4>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed mt-1 font-sans">
                Anda sedang menggunakan Mode Demo. Login untuk menggunakan data Supabase.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Supabase</span>
            </Link>
            <button
              onClick={() => setIsDismissed(true)}
              type="button"
              className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Lanjutkan</span>
            </button>
          </div>
        </div>
      );
    }
    return null; // Not configured & demo matches - no warning
  }

  // Demo role does not match
  const demoRoleLabel = getRoleLabel(currentDemoRole);
  const targetLabel = allowedRoles.map(r => getRoleLabel(r)).join(' atau ');

  return (
    <div className="w-full no-print bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-slide-in mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 mt-0.5 md:mt-0 flex-shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-400">Mode Uji Coba / Demo Role</h4>
          <p className="text-[11px] text-amber-200/80 leading-relaxed mt-1 font-sans">
            Anda sedang berada dalam mode {demoRoleLabel}. Halaman {currentPageName} biasanya dikelola oleh {targetLabel}.
            {isSupabaseConfigured && " Login untuk menguji data relasional."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
        <button
          onClick={() => {
            demoRoleService.setCurrentDemoRole(allowedRoles[0]);
            window.location.reload();
          }}
          type="button"
          className="flex-1 md:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/5"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin-once" />
          <span>Ganti ke {getRoleLabel(allowedRoles[0])}</span>
        </button>

        {isSupabaseConfigured && (
          <Link
            href="/login"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </Link>
        )}

        <button
          onClick={() => setIsDismissed(true)}
          type="button"
          className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          <span>Lanjutkan</span>
        </button>
      </div>
    </div>
  );
}
