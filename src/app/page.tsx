'use client';

import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';
import { 
  Brain, 
  Smartphone, 
  Laptop, 
  Sparkles,
  UserPlus,
  LogIn
} from 'lucide-react';

export default function LandingPage() {
  const { user, profile } = useAuth();

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
          {user && profile ? (
            <Link
              href={profile.role === 'admin' ? '/admin' : '/cashier'}
              className="text-[11px] font-bold text-emerald-400 px-3.5 py-2 rounded-xl border border-emerald-500/25 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all font-mono"
            >
              Dashboard ({profile.role === 'admin' ? 'Owner' : 'Kasir'})
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[11px] font-bold text-slate-350 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/50 transition-all"
            >
              Masuk Toko
            </Link>
          )}
          <span className="text-[11px] font-bold text-slate-450 px-3 py-1.5 rounded-xl border border-slate-850 bg-slate-900/30 hidden sm:inline-block">
            v1.0 Production Ready
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
          Ikuti ribuan pemilik usaha yang sukses bareng UMKM Pilot. Atur kasir pintar, stok otomatis, dan e-menu mandiri tanpa ribet. Biarkan AI kami yang analisis keuntungan, sementara Anda fokus buka cabang baru!
          <span className="block text-xs text-emerald-450 font-bold mt-3 bg-emerald-500/5 py-1 px-3.5 rounded-full border border-emerald-500/10 w-fit mx-auto animate-pulse">
            ✨ Mulai dari paket Free/Trial untuk mencoba.
          </span>
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
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors font-sans">
                Pesan Sekarang
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 font-sans">
                Akses halaman pemesanan pelanggan untuk menjelajahi menu digital, memesan mandiri, dan melihat estimasi waktu hidangan (ETA).
              </p>
            </div>
            <div className="mt-auto flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800/70 text-slate-300 font-bold border border-slate-700 text-xs font-sans text-center">
              <span>Scan QR toko atau gunakan link order dari UMKM.</span>
            </div>
          </div>

          {/* Card 2: Cashier Dashboard */}
          <div className="glass group relative rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-tr-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors font-sans">
                Login Admin & Kasir
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 font-sans">
                Masuk ke panel manajemen kasir atau dashboard utama untuk memproses pembayaran, mengelola stok produk, dan memantau pesanan aktif.
              </p>
            </div>
            <Link 
              href="/login"
              className="mt-auto inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/20 text-xs font-sans"
            >
              <span>Masuk Aplikasi</span>
              <LogIn className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Card 3: Register */}
          <div className="glass group relative rounded-2xl p-6 transition-all duration-300 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-500/10 to-transparent rounded-tr-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6 text-teal-400">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-400 transition-colors font-sans">
                Daftarkan Bisnis Anda
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 font-sans">
                Buat akun owner, pilih paket, dan mulai kelola bisnis Anda dengan UMKM Pilot.
              </p>
            </div>
            <Link 
              href="/register"
              className="mt-auto inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold border border-teal-500/20 hover:border-teal-400/40 transition-all text-xs font-sans cursor-pointer"
            >
              <span>Daftar Bisnis</span>
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-black/40 py-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 LimitMax. Dibuat dengan cinta untuk pertumbuhan UMKM Indonesia.</p>
      </footer>
    </div>
  );
}
