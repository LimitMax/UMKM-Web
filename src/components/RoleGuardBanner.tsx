'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, X } from 'lucide-react';
import { demoRoleService, DemoRole } from '../services/demoRoleService';

interface RoleGuardBannerProps {
  allowedRoles: DemoRole[];
  currentPageName: string;
}

export default function RoleGuardBanner({ allowedRoles, currentPageName }: RoleGuardBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || isDismissed) return null;

  const currentRole = demoRoleService.getCurrentDemoRole();

  // If role matches, no warning banner needed
  if (allowedRoles.includes(currentRole)) return null;

  const getRoleLabel = (role: DemoRole) => {
    if (role === 'admin') return 'Admin/Owner';
    if (role === 'cashier') return 'Kasir';
    return 'Pelanggan';
  };

  const getWarningMessage = () => {
    const roleLabel = getRoleLabel(currentRole);
    const targetLabel = allowedRoles.map(r => getRoleLabel(r)).join(' atau ');
    
    return `Anda sedang berada dalam mode ${roleLabel}. Halaman ${currentPageName} biasanya dikelola oleh ${targetLabel}.`;
  };

  const handleSwitchToAllowed = () => {
    // Switch to first allowed role
    const targetRole = allowedRoles[0];
    demoRoleService.setCurrentDemoRole(targetRole);
    // Reload to apply
    window.location.reload();
  };

  return (
    <div className="w-full no-print bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-slide-in mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 mt-0.5 md:mt-0 flex-shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-400">Mode Uji Coba / Demo Role</h4>
          <p className="text-[11px] text-amber-200/80 leading-relaxed mt-1 font-sans">
            {getWarningMessage()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={handleSwitchToAllowed}
          type="button"
          className="flex-1 md:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/5"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin-once" />
          <span>Ganti ke {getRoleLabel(allowedRoles[0])}</span>
        </button>
        
        <button
          onClick={() => setIsDismissed(true)}
          type="button"
          className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          <span className="md:inline hidden">Lanjutkan</span>
        </button>
      </div>
    </div>
  );
}
