'use client';

import { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, Check, Info } from 'lucide-react';
import { demoRoleService, DemoRole } from '../services/demoRoleService';

export default function DemoRoleSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center animate-pulse">
        <span className="text-[10px] text-slate-550 font-mono">Memuat...</span>
      </div>
    );
  }

  const currentRole = demoRoleService.getCurrentDemoRole();
  const currentUser = demoRoleService.getCurrentDemoUser();

  const handleRoleChange = (role: DemoRole) => {
    if (role === currentRole) return;
    demoRoleService.setCurrentDemoRole(role);
    setIsOpen(false);
    
    // Reload to refresh Next.js context and navigation sidebars
    window.location.reload();
  };

  const roleConfigs = [
    {
      id: 'admin' as DemoRole,
      label: 'Pemilik UMKM',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400',
      description: 'Akses penuh dashboard, produk, & laporan',
    },
    {
      id: 'cashier' as DemoRole,
      label: 'Kasir',
      badgeColor: 'bg-blue-500/10 border-blue-500/35 text-blue-400',
      description: 'Konfirmasi pembayaran & kelola antrean dapur',
    },
    {
      id: 'customer' as DemoRole,
      label: 'Pelanggan',
      badgeColor: 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400',
      description: 'Lihat menu, pesan, & cek status pesanan',
    },
  ];

  const currentConfig = roleConfigs.find((c) => c.id === currentRole) || roleConfigs[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`flex items-center gap-2 px-3 py-1.5 bg-slate-950 border rounded-xl hover:border-slate-700 transition-all font-mono text-[10px] text-left leading-tight ${currentConfig.badgeColor}`}
      >
        <User className="w-3.5 h-3.5" />
        <div className="flex flex-col">
          <span className="font-bold">{currentConfig.label}</span>
          <span className="text-[8px] opacity-75 font-sans">{currentUser.userName}</span>
        </div>
        <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 animate-slide-in">
          <div className="px-3 py-2 border-b border-slate-850 flex items-start gap-1.5 mb-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-normal font-sans">
              Mode demo aktif. Mengganti role akan mensimulasikan otorisasi UI tanpa mengapus data.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            {roleConfigs.map((roleOpt) => {
              const isSelected = roleOpt.id === currentRole;
              return (
                <button
                  key={roleOpt.id}
                  onClick={() => handleRoleChange(roleOpt.id)}
                  type="button"
                  className={`w-full text-left p-2 rounded-lg flex items-start justify-between transition-all hover:bg-slate-850 ${
                    isSelected ? 'bg-slate-850/40' : ''
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {roleOpt.label}
                    </span>
                    <span className="text-[8.5px] text-slate-400 font-sans leading-tight">
                      {roleOpt.description}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-850 text-center">
            <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider">
              Mode Demo UMKM Pilot
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
