'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  Database
} from 'lucide-react';
import { authService as supabaseAuthService } from '../../lib/services/authService';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, isSupabaseConfigured } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already authenticated via Supabase, redirect
  useEffect(() => {
    if (isSupabaseConfigured && user && profile) {
      if (profile.role === 'admin') router.push('/admin');
      else router.push('/cashier');
    }
  }, [user, profile, isSupabaseConfigured, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (isSupabaseConfigured) {
        // Real Supabase Auth Login
        await supabaseAuthService.signInWithEmail(email, password);
        
        const currentUser = await supabaseAuthService.getCurrentUser();
        if (currentUser) {
          const currentProfile = await supabaseAuthService.getCurrentProfile();
          if (currentProfile) {
            if (currentProfile.role === 'admin') {
              router.push('/admin');
            } else {
              router.push('/cashier');
            }
            return;
          }
        }
        throw new Error('Gagal memuat profil akun dari database Supabase.');
      } else {
        throw new Error('Supabase belum dikonfigurasi. Silakan hubungi admin sistem.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black px-4 py-12 relative overflow-hidden">
      
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full flex flex-col gap-6 relative z-10">
        
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-3">
              UMKM <span className="text-emerald-400">Pilot</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Kelola Bisnis Lebih Mudah & Pintar</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass rounded-3xl p-8 border border-slate-800/80 shadow-2xl">
          
          {/* Supabase status notice */}
          {!isSupabaseConfigured ? (
            <div className="mb-6 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-350 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
              <Database className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Database Belum Siap</span>
                Supabase belum dikonfigurasi. Silakan isi file konfigurasi <code className="bg-slate-950 px-1 py-0.5 rounded text-white text-[9px]">.env.local</code>.
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-350 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
              <Database className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Koneksi Supabase Aktif</span>
                Gunakan email dan kata sandi yang telah Anda daftarkan di dashboard.
              </div>
            </div>
          )}

          <h2 className="text-lg font-bold text-white mb-6">Masuk ke Akun Anda</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Alamat Email *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Kata Sandi *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 disabled:text-slate-500 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

        </div>

        <div className="text-center text-xs text-slate-500">
          <span>Belum punya akun toko? </span>
          <Link href="/register" className="text-emerald-400 hover:underline font-bold">
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
