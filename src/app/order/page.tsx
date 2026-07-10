'use client';

import Link from 'next/link';
import { ArrowLeft, QrCode } from 'lucide-react';

export default function GenericOrderPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-7 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5">
          <QrCode className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-white mb-2">Link order tidak lengkap</h1>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Silakan scan QR dari toko atau gunakan link menu yang diberikan oleh UMKM.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}
