'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles, X } from 'lucide-react';

interface UpgradeAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  featureName?: string;
}

export default function UpgradeAlertModal({
  isOpen,
  onClose,
  title = 'Fitur Premium AI Terkunci',
  description = 'Fitur ini membutuhkan paket Pro. Dapatkan analisis AI Insights lengkap, Tanya AI Pilot, dan akses laporan performa premium untuk mendukung pertumbuhan UMKM Anda.',
  featureName,
}: UpgradeAlertModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    onClose();
    // Redirect to settings page with tab set to payment
    router.push('/admin/settings?tab=payment');
  };

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs transition-opacity duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-5 relative z-10 animate-zoom-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Premium Lock Icon Box */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <div className="relative">
            <Lock className="w-7 h-7 text-white stroke-[2]" />
            <Sparkles className="w-4 h-4 text-emerald-300 absolute -top-2.5 -right-2.5 animate-pulse" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          {featureName && (
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              {featureName}
            </span>
          )}
          <h3 className="text-base font-black text-white">{title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed px-1">
            {description}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full flex flex-col gap-2 mt-2">
          <button
            onClick={handleUpgradeClick}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/10 border-none cursor-pointer"
          >
            Upgrade Sekarang
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all border border-slate-750 cursor-pointer"
          >
            Nanti Saja
          </button>
        </div>

      </div>
    </div>
  );
}
