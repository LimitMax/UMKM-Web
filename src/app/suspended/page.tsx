'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';

export default function SuspendedBusinessPage() {
  const router = useRouter();
  const { currentBusiness, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const reason = currentBusiness?.suspended_reason || 'Hubungi administrator platform untuk informasi lebih lanjut.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black px-4 py-12 relative overflow-hidden">
      
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-80 h-80 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full flex flex-col gap-6 relative z-10 text-center">
        
        {/* Warning Icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/10 mx-auto">
            <ShieldAlert className="w-8 h-8 text-rose-400 stroke-[2]" />
          </div>
          <h1 className="text-xl font-black text-white mt-4 font-sans tracking-tight">
            Akses Bisnis Ditangguhkan
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {currentBusiness?.name || 'Bisnis Anda'}
          </p>
        </div>

        {/* Reason Box */}
        <div className="glass rounded-3xl p-6 border border-slate-800/80 shadow-2xl text-left">
          <h2 className="text-[10px] font-mono text-slate-500 uppercase mb-2">Alasan Penangguhan</h2>
          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl">
            <p className="text-xs text-rose-250 leading-relaxed font-sans font-medium">
              &ldquo;{reason}&rdquo;
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-sans">
            Seluruh operasional dashboard admin, login kasir, dan halaman pemesanan pelanggan untuk bisnis ini telah dinonaktifkan sementara.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <a
            href="mailto:support@umkmpilot.com?subject=Banding%20Penangguhan%20Bisnis"
            className="flex-1 py-3 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 font-sans"
          >
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>Hubungi Bantuan</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex-1 py-3 px-4 bg-rose-650 hover:bg-rose-550 text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 font-sans shadow-lg shadow-rose-900/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>

      </div>
    </div>
  );
}
