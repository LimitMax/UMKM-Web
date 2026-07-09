'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  User, 
  Mail, 
  Briefcase, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Database,
  Lock
} from 'lucide-react';
import { authService as supabaseAuthService } from '../../lib/services/authService';
import { authService as mockAuthService } from '../../services/authService';
import { demoRoleService } from '../../services/demoRoleService';
import { useAuth } from '../../components/AuthProvider';
import { supabaseClient } from '../../lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const { isSupabaseConfigured } = useAuth();
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isBizSeeded, setIsBizSeeded] = useState(true);

  // Check if biz-1 is seeded when Supabase is active
  useEffect(() => {
    async function checkBusiness() {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseClient
            .from('businesses')
            .select('id')
            .eq('id', 'biz-1')
            .maybeSingle();
          
          if (error || !data) {
            setIsBizSeeded(false);
          } else {
            setIsBizSeeded(true);
          }
        } catch (err) {
          console.error('Error verifying seeded business:', err);
          setIsBizSeeded(false);
        }
      }
    }
    checkBusiness();
  }, [isSupabaseConfigured]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('Kata sandi harus minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (isSupabaseConfigured && !isBizSeeded) {
      setErrorMsg('Tidak dapat mendaftar: Database Supabase belum di-seed dengan bisnis default "biz-1". Silakan jalankan seed.sql terlebih dahulu.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured) {
        // Real Supabase register
        await supabaseAuthService.signUpWithEmail(email, password, name, role, 'biz-1');
        
        // Auto-update demo role switcher state to align with registered user
        demoRoleService.setCurrentDemoRole(role);

        setSuccessMsg('Pendaftaran berhasil! Akun dan profil telah dibuat. Mengalihkan...');
        
        setTimeout(() => {
          if (role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/cashier');
          }
        }, 1500);
      } else {
        // Mock register
        const mockUser = await mockAuthService.register(name, email, role, 'Warung Kopi Nusantara');
        demoRoleService.setCurrentDemoRole(role);
        
        setSuccessMsg('Pendaftaran demo berhasil! Mengalihkan...');
        
        setTimeout(() => {
          if (mockUser.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/cashier');
          }
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Pendaftaran gagal.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black px-4 py-12 relative overflow-hidden">
      
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-80 h-85 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

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
            <p className="text-xs text-slate-400 mt-1">Daftarkan Bisnis & Tim Anda Sekarang</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass rounded-3xl p-8 border border-slate-800/80 shadow-2xl">
          
          {/* Supabase status notice */}
          {isSupabaseConfigured ? (
            isBizSeeded ? (
              <div className="mb-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
                <Database className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Database Supabase Siap</span>
                  Pendaftaran akan membuat akun auth &amp; baris profil baru dengan bisnis &quot;biz-1&quot;.
                </div>
              </div>
            ) : (
              <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-350 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Seed Data Belum Dijalankan</span>
                  Bisnis default &quot;biz-1&quot; tidak ditemukan. Jalankan <code className="bg-slate-950 px-1 py-0.5 rounded text-white text-[9px]">seed.sql</code> terlebih dahulu di SQL Editor Supabase.
                </div>
              </div>
            )
          ) : (
            <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] leading-relaxed font-mono flex items-start gap-2.5">
              <Database className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Mode Demo Aktif</span>
                Supabase belum dikonfigurasi. Form akan menyimpan akun pendaftaran secara lokal.
              </div>
            </div>
          )}

          <h2 className="text-lg font-bold text-white mb-5">Daftar Akun Baru</h2>
          
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            
            {/* Nama Lengkap */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Lengkap *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Alamat Email *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Peran Staff *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
                  <Briefcase className="w-4 h-4" />
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="admin">Pemilik UMKM (Admin)</option>
                  <option value="cashier">Staf Kasir</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4 text-slate-500" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

            {/* Kata Sandi */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Kata Sandi *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Konfirmasi Kata Sandi */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Konfirmasi Kata Sandi *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (isSupabaseConfigured && !isBizSeeded)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 disabled:text-slate-500 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Daftar Akun</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          <span>Sudah memiliki akun? </span>
          <Link href="/login" className="text-emerald-400 hover:underline font-bold">
            Masuk Sekarang
          </Link>
        </div>

      </div>
    </div>
  );
}
