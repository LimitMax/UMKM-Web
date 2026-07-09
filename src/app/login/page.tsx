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
  UserCheck,
  ShieldCheck,
  Database
} from 'lucide-react';
import { authService as supabaseAuthService } from '../../lib/services/authService';
import { authService as mockAuthService } from '../../services/authService';
import { demoRoleService } from '../../services/demoRoleService';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, isDemoMode, isSupabaseConfigured } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already authenticated via Supabase or demo mode, redirect
  useEffect(() => {
    if (isSupabaseConfigured && !isDemoMode && user && profile) {
      if (profile.role === 'admin') router.push('/admin');
      else router.push('/cashier');
    } else if (isDemoMode) {
      const mockSession = mockAuthService.getCurrentUser();
      if (mockSession) {
        if (mockSession.role === 'admin') router.push('/admin');
        else router.push('/cashier');
      }
    }
  }, [user, profile, isDemoMode, isSupabaseConfigured, router]);

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
            // Update demo role switcher state to align with logged-in user
            demoRoleService.setCurrentDemoRole(currentProfile.role);
            
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
        // Fallback to Mock Auth
        const userSession = await mockAuthService.login(email);
        demoRoleService.setCurrentDemoRole(userSession.role);
        
        if (userSession.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/cashier');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.');
      setIsLoading(false);
    }
  };

  // Quick Login Test Helper (Demo mode)
  const handleQuickLogin = async (role: 'admin' | 'cashier') => {
    setErrorMsg('');
    setIsLoading(true);
    const mockEmail = role === 'admin' ? 'admin@tokoku.com' : 'cashier@tokoku.com';
    
    try {
      const userSession = await mockAuthService.login(mockEmail);
      demoRoleService.setCurrentDemoRole(role);
      
      if (userSession.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/cashier');
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
            <div className="mb-6 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
              <Database className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Mode Demo Aktif</span>
                Supabase belum dikonfigurasi. Form di bawah akan disimulasikan menggunakan data lokal.
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
              <Database className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Koneksi Supabase Siap</span>
                Otentikasi nyata aktif. Masuk menggunakan email dan password terdaftar.
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
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

          {/* Quick Login Test buttons */}
          <div className="border-t border-slate-850 pt-6 mt-6">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 text-center">
              Akses Cepat Pengujian (Demo)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={isLoading}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-bold text-xs transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Akun Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('cashier')}
                disabled={isLoading}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold text-xs transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Akun Kasir</span>
              </button>
            </div>
          </div>
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
