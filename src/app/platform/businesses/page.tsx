'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Ban,
  Archive,
  Trash2,
  Play
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';

interface BusinessRow {
  id: string;
  name: string;
  business_type: string | null;
  slug: string | null;
  plan_code: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string;
  status: 'trial' | 'active' | 'suspended' | 'archived';
  suspended_reason: string | null;
  suspended_at: string | null;
  deleted_at: string | null;
  products_count: number;
  orders_count: number;
  owner_name: string;
  owner_email: string;
}

const PAGE_SIZE = 10;

function StatusBadge({ status, deletedAt }: { status: string | null; deletedAt?: string | null }) {
  if (deletedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <Trash2 className="w-3 h-3" /> Soft Deleted
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Aktif
      </span>
    );
  }
  if (status === 'trial') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
        <Clock className="w-3 h-3" /> Trial
      </span>
    );
  }
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
        <Ban className="w-3 h-3" /> Suspended
      </span>
    );
  }
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Archive className="w-3 h-3" /> Archived
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
      {status ?? '—'}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  const colorMap: Record<string, string> = {
    free: 'bg-slate-800 text-slate-400 border-slate-700',
    starter: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    pro: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    growth: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    enterprise: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  };
  const key = (plan || 'free').toLowerCase();
  const cls = colorMap[key] || colorMap.free;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${cls}`}>
      {plan ?? 'free'}
    </span>
  );
}

export default function PlatformBusinessesPage() {
  const { user: supabaseUser } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Filters & Sorting States
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'name' | 'created_at' | 'plan_code' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Suspension Modal State
  const [suspendingBizId, setSuspendingBizId] = useState<string | null>(null);
  const [suspendingBizName, setSuspendingBizName] = useState<string>('');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [suspendError, setSuspendError] = useState<string>('');

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/platform/businesses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat daftar bisnis.');
      }

      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadBusinesses();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadBusinesses]);

  // Handle Business Actions (Activate, Archive, Delete, Restore)
  const handleStatusChange = async (id: string, action: string, reason?: string) => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/businesses/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memperbarui status bisnis.');
      }

      // Close modal if open
      setSuspendingBizId(null);
      setSuspendReason('');
      
      // Reload business rows
      await loadBusinesses();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const openSuspendModal = (id: string, name: string) => {
    setSuspendingBizId(id);
    setSuspendingBizName(name);
    setSuspendReason('');
    setSuspendError('');
  };

  const submitSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) {
      setSuspendError('Alasan penangguhan wajib diisi.');
      return;
    }
    if (suspendingBizId) {
      await handleStatusChange(suspendingBizId, 'suspend', suspendReason);
    }
  };

  // Client-side search, filters, and sort
  const filteredAndSorted = useMemo(() => {
    let result = [...businesses];

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.owner_name.toLowerCase().includes(q) ||
          b.owner_email.toLowerCase().includes(q) ||
          (b.plan_code || '').toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (statusFilter === 'All') {
      // Hidden from active tenant list by default if archived/deleted
      result = result.filter((b) => b.status !== 'archived' && !b.deleted_at);
    } else if (statusFilter === 'Trial') {
      result = result.filter((b) => b.status === 'trial');
    } else if (statusFilter === 'Active') {
      result = result.filter((b) => b.status === 'active');
    } else if (statusFilter === 'Suspended') {
      result = result.filter((b) => b.status === 'suspended');
    } else if (statusFilter === 'Archived') {
      result = result.filter((b) => b.status === 'archived' && !b.deleted_at);
    } else if (statusFilter === 'SoftDeleted') {
      result = result.filter((b) => b.deleted_at !== null);
    }

    // 3. Plan Filter
    if (planFilter !== 'All') {
      const pCode = planFilter.toLowerCase();
      result = result.filter((b) => {
        if (pCode === 'growth') {
          return b.plan_code === 'pro' || b.plan_code === 'growth';
        }
        return b.plan_code === pCode;
      });
    }

    // 4. Sorting
    result.sort((x, y) => {
      let valX: string | number = '';
      let valY: string | number = '';

      if (sortField === 'name') {
        valX = x.name.toLowerCase();
        valY = y.name.toLowerCase();
      } else if (sortField === 'created_at') {
        valX = new Date(x.created_at).getTime();
        valY = new Date(y.created_at).getTime();
      } else if (sortField === 'plan_code') {
        valX = (x.plan_code || '').toLowerCase();
        valY = (y.plan_code || '').toLowerCase();
      } else if (sortField === 'status') {
        valX = (x.status || '').toLowerCase();
        valY = (y.status || '').toLowerCase();
      }

      if (valX < valY) return sortDirection === 'asc' ? -1 : 1;
      if (valX > valY) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [businesses, search, statusFilter, planFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const paginated = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when search or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter, planFilter]);

  const toggleSort = (field: 'name' | 'created_at' | 'plan_code' | 'status') => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-violet-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              PLATFORM OWNER
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Manajemen Bisnis</h1>
          <p className="text-xs text-slate-400 mt-1">
            Mengelola dan mengawasi seluruh penyewa (tenants) pada platform
          </p>
        </div>
        <button
          onClick={loadBusinesses}
          disabled={loading || actionLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(loading || actionLoading) ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Search */}
        <div className="relative w-full lg:max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="platform-businesses-search"
            type="text"
            placeholder="Cari bisnis, owner, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
            >
              <option value="All">Semua (Aktif/Trial/Suspended)</option>
              <option value="Active">Aktif</option>
              <option value="Trial">Trial</option>
              <option value="Suspended">Suspended</option>
              <option value="Archived">Archived</option>
              <option value="SoftDeleted">Soft Deleted</option>
            </select>
          </div>

          {/* Plan filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Paket</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
            >
              <option value="All">Semua Paket</option>
              <option value="Starter">Starter</option>
              <option value="Growth">Growth (Pro)</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

        </div>

      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Memuat daftar penyewa...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Building2 className="w-10 h-10 text-slate-700" />
            <p className="text-xs text-slate-500">
              {search || statusFilter !== 'All' || planFilter !== 'All' ? 'Tidak ada bisnis yang cocok dengan filter.' : 'Belum ada bisnis terdaftar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-slate-500 uppercase tracking-wider text-[10px]">
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nama Bisnis</span>
                      {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Owner</th>
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => toggleSort('plan_code')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Paket</span>
                      {sortField === 'plan_code' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => toggleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-center">Produk / Order</th>
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => toggleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Terdaftar</span>
                      {sortField === 'created_at' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((biz, idx) => (
                  <tr
                    key={biz.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/20'
                    }`}
                  >
                    {/* Business Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div>
                          <span className="font-bold text-white block truncate max-w-[150px]">{biz.name}</span>
                          {biz.business_type && (
                            <span className="text-[10px] text-slate-500">{biz.business_type}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Owner detail */}
                    <td className="px-5 py-4">
                      <span className="text-slate-200 font-medium block truncate max-w-[140px]">{biz.owner_name}</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">{biz.owner_email}</span>
                    </td>

                    {/* Plan Code */}
                    <td className="px-5 py-4">
                      <PlanBadge plan={biz.plan_code} />
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <StatusBadge status={biz.status} deletedAt={biz.deleted_at} />
                    </td>

                    {/* Counts */}
                    <td className="px-5 py-4 text-center font-mono text-slate-350">
                      <span>{biz.products_count} / {biz.orders_count}</span>
                    </td>

                    {/* Created Date */}
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {formatDate(biz.created_at)}
                    </td>

                    {/* Actions panel */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* Detail Link */}
                        <Link
                          href={`/platform/businesses/${biz.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition-all"
                          title="Detail Bisnis"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {/* Activate / Suspend Toggle */}
                        {biz.status === 'suspended' ? (
                          <button
                            onClick={() => {
                              if (window.confirm(`Aktifkan kembali akses bisnis "${biz.name}"?`)) {
                                void handleStatusChange(biz.id, 'activate');
                              }
                            }}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all disabled:opacity-50"
                            title="Aktifkan Akses"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (
                          !biz.deleted_at && biz.status !== 'archived' && (
                            <button
                              onClick={() => openSuspendModal(biz.id, biz.name)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-all disabled:opacity-50"
                              title="Tangguhkan (Suspend) Akses"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}

                        {/* Archive Toggle */}
                        {biz.status !== 'archived' && !biz.deleted_at && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Arsipkan bisnis "${biz.name}"? Bisnis akan dinonaktifkan dari login dan list.`)) {
                                void handleStatusChange(biz.id, 'archive');
                              }
                            }}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all disabled:opacity-50"
                            title="Arsipkan Bisnis"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Soft Delete button */}
                        {!biz.deleted_at ? (
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus sementara (Soft Delete) bisnis "${biz.name}"? Semua data diarsipkan.`)) {
                                void handleStatusChange(biz.id, 'soft_delete');
                              }
                            }}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900/40 text-rose-450 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                            title="Soft Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          // Restore button
                          <button
                            onClick={() => {
                              if (window.confirm(`Pulihkan kembali bisnis "${biz.name}" dari penghapusan?`)) {
                                void handleStatusChange(biz.id, 'restore');
                              }
                            }}
                            disabled={actionLoading}
                            className="px-2 py-1 rounded-lg bg-violet-650 hover:bg-violet-550 text-white font-bold text-[10px] transition-all disabled:opacity-50"
                          >
                            Restore
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination control */}
      {!loading && filteredAndSorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-mono">
            Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredAndSorted.length)} dari {filteredAndSorted.length} bisnis
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 font-mono px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendingBizId && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Tangguhkan Bisnis (Suspend)</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menangguhkan akses untuk bisnis <span className="font-bold text-white">&ldquo;{suspendingBizName}&rdquo;</span>?
                </p>
              </div>
            </div>

            <form onSubmit={submitSuspend} className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">
                  Alasan Penangguhan (Wajib diisi & akan ditampilkan ke Owner)
                </label>
                <textarea
                  required
                  rows={4}
                  value={suspendReason}
                  onChange={(e) => {
                    setSuspendReason(e.target.value);
                    setSuspendError('');
                  }}
                  placeholder="Misalnya: Melanggar ketentuan UAT, pembayaran langganan kadaluarsa, penyalahgunaan sistem..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-rose-500 resize-none font-sans"
                />
                {suspendError && (
                  <p className="text-[10px] text-rose-400 font-mono mt-1">{suspendError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendingBizId(null)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all font-sans"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-rose-650 hover:bg-rose-550 text-white font-bold text-xs rounded-xl transition-all shadow-lg hover:shadow-rose-900/25 flex items-center gap-1.5 font-sans"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Tangguhkan Bisnis</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
