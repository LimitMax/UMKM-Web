'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Database,
} from 'lucide-react';
import { authService as supabaseAuthService } from '../../../lib/services/authService';
import { profileService } from '../../../lib/services/profileService';
import { useAuth } from '../../../components/AuthProvider';

export default function PlatformLoginPage() {
  const router = useRouter();
  const { user, profile, isSupabaseConfigured, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already authenticated as platform_owner, redirect to dashboard
  useEffect(() => {
    if (isSupabaseConfigured && !loading && user && !isLoading) {
      if (profile) {
        if (profile.role === 'platform_owner') {
          router.push('/platform/dashboard');
        } else {
          // Business user accidentally landed here — redirect them to their login
          router.push('/login');
        }
      }
    }
  }, [user, profile, isSupabaseConfigured, router, isLoading, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase belum dikonfigurasi. Silakan hubungi admin sistem.');
      }

      const loginData = await supabaseAuthService.signInWithEmail(email, password);
      const currentUser = loginData.user;
      if (!currentUser) {
        throw new Error('Gagal memuat sesi pengguna.');
      }

      const currentProfile = await profileService.getProfileByUserId(currentUser.id);
      if (!currentProfile) {
        throw new Error('Gagal memuat profil akun dari database Supabase.');
      }

      if (currentProfile.role !== 'platform_owner') {
        // Sign them out immediately — wrong role for this portal
        await supabaseAuthService.signOut();
        throw new Error(
          'Akun ini tidak terdaftar sebagai Pemilik Platform. Gunakan halaman login bisnis di /login.'
        );
      }
      
      // Let useEffect handle redirection once AuthProvider updates global state
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.');
    } finally {
      // Always reset loading — whether login succeeded, failed, or router is still navigating
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black px-4 py-12 relative overflow-hidden">

      {/* Decorative glows — violet palette for platform identity */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full flex flex-col gap-6 relative z-10">

        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <ShieldCheck className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-3">
              Platform <span className="text-violet-400">Console</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Portal Pemilik Platform — UMKM Pilot</p>
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
                Supabase belum dikonfigurasi. Silakan isi file{' '}
                <code className="bg-slate-950 px-1 py-0.5 rounded text-white text-[9px]">.env.local</code>.
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Portal Pemilik Platform</span>
                Hanya akun dengan role <strong>platform_owner</strong> yang dapat masuk melalui portal ini.
              </div>
            </div>
          )}

          <h2 className="text-lg font-bold text-white mb-6">Masuk ke Platform Console</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                Alamat Email *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="platform-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="platform@email.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                Kata Sandi *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="platform-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
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
              id="platform-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 text-white disabled:text-slate-500 font-bold rounded-xl transition-all shadow-lg hover:shadow-violet-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk Platform Console</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          <span>Pemilik bisnis? </span>
          <a href="/login" className="text-violet-400 hover:underline font-bold">
            Login di sini
          </a>
        </div>
      </div>
    </div>
  );
}
