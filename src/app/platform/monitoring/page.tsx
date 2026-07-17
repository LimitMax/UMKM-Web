'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Key,
  CreditCard,
  Webhook,
  Brain,
  Globe,
  Radio
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';

interface MonitoringService {
  name: string;
  status: 'Healthy' | 'Warning' | 'Offline';
  lastChecked: string;
  automatic: boolean;
  error: string | null;
}

export default function PlatformMonitoringPage() {
  const { user: supabaseUser } = useAuth();

  const [services, setServices] = useState<MonitoringService[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadMonitoring = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/platform/monitoring', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat status monitoring.');
      }

      const json = await res.json();
      setServices(json.services || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadMonitoring();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadMonitoring]);

  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('database')) return Database;
    if (n.includes('auth')) return Key;
    if (n.includes('realtime')) return Radio;
    if (n.includes('storage')) return Server;
    if (n.includes('payment')) return CreditCard;
    if (n.includes('webhook')) return Webhook;
    if (n.includes('llm')) return Brain;
    return Globe;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Healthy') return 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'Warning') return 'text-amber-450 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-450 bg-rose-500/10 border-rose-500/20';
  };

  const getIndicatorColor = (status: string) => {
    if (status === 'Healthy') return 'bg-emerald-500 shadow-emerald-500/20';
    if (status === 'Warning') return 'bg-amber-500 shadow-amber-500/20';
    return 'bg-rose-500 shadow-rose-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-500 font-sans">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Memeriksa status vital layanan cloud...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-violet-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              System Health
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Status Layanan Platform</h1>
          <p className="text-xs text-slate-400 mt-0.5">Pantau integritas dan koneksi database, auth gateway, webhooks, Nara LLM, dan Midtrans.</p>
        </div>
        <button
          onClick={loadMonitoring}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all self-start sm:self-center"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Segarkan Status</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Services status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((srv) => {
          const Icon = getServiceIcon(srv.name);
          return (
            <div
              key={srv.name}
              className="glass rounded-2xl border border-slate-850 p-5 flex flex-col justify-between min-h-[140px] bg-slate-900/10 hover:border-slate-800 transition-all"
            >
              <div>
                {/* Service Header */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-950/60 border border-slate-850 flex items-center justify-center text-slate-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-white text-xs">{srv.name}</span>
                  </div>

                  {/* Healthy/Warning/Offline Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(srv.status)}`}>
                    {srv.status}
                  </span>
                </div>

                {/* Last Webhook event or check details */}
                {srv.error && (
                  <p className="text-[10px] text-slate-450 leading-relaxed font-sans mt-2 p-2.5 bg-slate-950/50 border border-slate-900 rounded-lg break-all">
                    {srv.error}
                  </p>
                )}

                {/* Unavailable indicator notice if manual */}
                {!srv.automatic && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <span>Unavailable for automatic monitoring</span>
                  </div>
                )}
              </div>

              {/* Footer check time */}
              <div className="pt-3 border-t border-slate-950 flex items-center justify-between text-[9px] font-mono text-slate-500 mt-4">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full animate-ping ${getIndicatorColor(srv.status)}`} />
                  <span>Check time: {new Date(srv.lastChecked).toLocaleTimeString('id-ID')}</span>
                </span>
                <span>{srv.automatic ? 'AUTO PING' : 'STATIC CHECK'}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
