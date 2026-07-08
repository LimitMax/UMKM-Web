'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  Smartphone, 
  Laptop, 
  ShieldAlert, 
  ArrowRight, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { resetDB } from '../services/db';

export default function LandingPage() {
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    resetDB();
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              UMKM <span className="text-emerald-400">Pilot</span>
            </span>
            <span className="block text-[10px] text-emerald-400/80 font-mono tracking-widest uppercase -mt-1">AI Powered</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/50">
            v1.0 MVP Ready
          </span>
        </div>
      </header>

      {/* Hero & Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10 max-w-7xl mx-auto w-full">
        {/* Title Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-950/30 text-emerald-400 text-xs font-medium mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Solusi Digitalisasi UMKM Masa Kini</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center max-w-4xl tracking-tight leading-[1.15] mb-6">
          Kembangkan Bisnismu Lebih Cepat dengan{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            UMKM Pilot
          </span>
        </h1>

        <p className="text-slate-400 text-center max-w-2xl text-base md:text-lg mb-12 leading-relaxed">
          Platform all-in-one untuk toko kelontong, kafe, laundry, dan rumah makan. 
          Kelola pemesanan meja mandiri, kasir pintar, kontrol stok real-time, dan dapatkan analisis bisnis bertenaga AI.
        </p>

        {/* Feature / Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-12">
          {/* Card 1: Customer Order */}
          <div className="glass group relative rounded-2xl p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-tr-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                Pesan Mandiri
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Halaman khusus pelanggan. Scan QR, jelajahi menu makanan/minuman, tambah ke keranjang, dan langsung pesan secara digital.
              </p>
            </div>
            <Link 
              href="/order" 
              className="mt-auto inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-lg hover:shadow-emerald-500/20"
            >
              <span>Pesan Sekarang</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Card 2: Cashier Dashboard */}
          <div className="glass group relative rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-tr-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                Dashboard Kasir
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Proses pesanan pelanggan secara instan. Terima pembayaran tunai/e-wallet, kelola antrean, dan pantau status pesanan dapur.
              </p>
            </div>
            <Link 
              href="/cashier" 
              className="mt-auto inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/20"
            >
              <span>Buka Layanan Kasir</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Card 3: Admin Portal */}
          <div className="glass group relative rounded-2xl p-6 transition-all duration-300 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-500/10 to-transparent rounded-tr-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6 text-teal-400">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-400 transition-colors">
                Portal Admin & AI
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Kelola produk, pantau stok dengan peringatan otomatis, riwayat transaksi lengkap, dan dapatkan insight bisnis otomatis bertenaga AI.
              </p>
            </div>
            <Link 
              href="/admin" 
              className="mt-auto inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold border border-teal-500/20 hover:border-teal-400/40 transition-all"
            >
              <span>Masuk Admin Panel</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Security & Database Warning Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-4 px-5 py-4 rounded-2xl border border-slate-800 bg-slate-900/30 max-w-2xl text-center sm:text-left text-xs text-slate-400">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <strong>Mode Demo MVP:</strong> Seluruh data disimpan lokal pada browser (LocalStorage).
          </div>
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetSuccess ? 'animate-spin' : ''}`} />
            <span>{resetSuccess ? 'Data Direset...' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-black/40 py-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 UMKM Pilot. Dibuat dengan cinta untuk pertumbuhan UMKM Indonesia.</p>
      </footer>
    </div>
  );
}
