'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Search,
  Gift,
  X,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabaseClient } from '@/lib/supabase/client';
import RoleGuardBanner from '@/components/RoleGuardBanner';

interface BusinessVoucher {
  id: string;
  business_id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function AdminVouchersPage() {
  const { user: supabaseUser } = useAuth();

  const [vouchers, setVouchers] = useState<BusinessVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTime] = useState(() => Date.now());
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('0');
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/admin/vouchers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat daftar voucher.');
      }

      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadVouchers();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadVouchers]);

  // Set default dates when opening modal
  const openCreateModal = () => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    const formatISODate = (d: Date) => d.toISOString().split('T')[0];

    setCode('');
    setName('');
    setDiscountType('percentage');
    setDiscountValue('10');
    setMinOrderAmount('0');
    setMaxDiscount('');
    setStartDate(formatISODate(today));
    setEndDate(formatISODate(nextMonth));
    setUsageLimit('');
    setIsActive(true);
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const generateRandomCode = () => {
    const prefixes = ['PROMO', 'MANTAP', 'HEMAT', 'DISKON', 'UMKM', 'COBA'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900); // 3 digits
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    setCode(`${randomPrefix}${randomStr}${randomNum}`);
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      // Prepare payload
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: Number(minOrderAmount),
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate + 'T23:59:59').toISOString(),
        usage_limit: usageLimit ? Number(usageLimit) : null,
        is_active: isActive,
      };

      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || 'Gagal membuat voucher.');
      }

      setSuccessMsg(resData.message || 'Voucher berhasil dibuat!');
      setModalOpen(false);
      loadVouchers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (voucher: BusinessVoucher) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/admin/vouchers/${voucher.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !voucher.is_active }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal merubah status voucher.');
      }

      setSuccessMsg(`Status voucher ${voucher.code} berhasil diperbarui.`);
      loadVouchers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal merubah status voucher.');
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/admin/vouchers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal menghapus voucher.');
      }

      setSuccessMsg('Voucher berhasil dihapus.');
      setDeleteConfirmId(null);
      loadVouchers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus voucher.');
    } finally {
      setActionLoading(false);
    }
  };

  const isExpired = (expiryStr: string) => {
    return new Date(expiryStr).getTime() < nowTime;
  };

  // Filtered Vouchers
  const filtered = vouchers.filter((v) => {
    const matchesSearch =
      v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesType = true;
    if (typeFilter !== 'all') {
      matchesType = v.discount_type === typeFilter;
    }

    let matchesStatus = true;
    const expired = isExpired(v.end_date);
    if (statusFilter === 'active') {
      matchesStatus = v.is_active && !expired;
    } else if (statusFilter === 'inactive') {
      matchesStatus = !v.is_active;
    } else if (statusFilter === 'expired') {
      matchesStatus = expired;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalVouchers = vouchers.length;
  const activeVouchers = vouchers.filter((v) => v.is_active && !isExpired(v.end_date)).length;
  const totalUses = vouchers.reduce((acc, curr) => acc + (curr.used_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Role Guard Banner */}
      <RoleGuardBanner allowedRoles={['admin']} currentPageName="Kelola Voucher & Promo" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              FITUR PROMO TOKO
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Kupon & Voucher Diskon</h1>
          <p className="text-xs text-slate-400 mt-1">Buat kode promo diskon menarik untuk menarik minat customer Anda</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer border-none"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span>Buat Voucher Baru</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-455 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-350 flex items-start gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">Total Voucher</span>
            <p className="text-2xl font-black text-white mt-1">{totalVouchers}</p>
          </div>
          <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">Voucher Aktif</span>
            <p className="text-2xl font-black text-emerald-450 mt-1">{activeVouchers}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <Gift className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">Total Penggunaan</span>
            <p className="text-2xl font-black text-violet-400 mt-1">{totalUses} kali</p>
          </div>
          <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode atau nama promo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'percentage' | 'fixed')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Tipe Diskon</option>
            <option value="percentage">Persentase (%)</option>
            <option value="fixed">Nominal Tetap (Rp)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'expired')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif & Berlaku</option>
            <option value="inactive">Non-Aktif</option>
            <option value="expired">Kadaluarsa</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      {loading ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Memproses data voucher...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
          <Ticket className="w-12 h-12 text-slate-650 mx-auto mb-4" />
          <h3 className="font-bold text-white text-sm mb-1">Belum Ada Voucher</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
            Mulai buat kampanye voucher promo dengan menekan tombol Buat Voucher Baru di atas.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Kode / Detail Voucher</th>
                  <th className="p-4">Tipe & Nilai Diskon</th>
                  <th className="p-4">Aturan Belanja</th>
                  <th className="p-4">Ketersediaan</th>
                  <th className="p-4">Masa Berlaku</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filtered.map((voucher) => {
                  const expired = isExpired(voucher.end_date);
                  return (
                    <tr key={voucher.id} className="hover:bg-slate-950/20 text-slate-200 transition-colors">
                      {/* Code & Name */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${voucher.discount_type === 'percentage' ? 'bg-violet-600/10 text-violet-400 border border-violet-600/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
                            <Ticket className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-mono font-black text-white tracking-wider block bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800 text-[11px] w-fit">
                              {voucher.code}
                            </span>
                            <span className="text-[11px] text-slate-450 block mt-1 font-medium font-sans">
                              {voucher.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Discount details */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase font-sans ${voucher.discount_type === 'percentage' ? 'bg-violet-900/40 text-violet-300 border border-violet-800/30' : 'bg-teal-900/40 text-teal-300 border border-teal-800/30'}`}>
                          {voucher.discount_type === 'percentage'
                            ? `${voucher.discount_value}% Diskon`
                            : `${formatRupiah(voucher.discount_value)}`}
                        </span>
                      </td>

                      {/* Purchase Limits */}
                      <td className="p-4 font-mono text-[10px] text-slate-350">
                        <div className="space-y-0.5">
                          <div>Min: <strong className="text-white">{formatRupiah(voucher.min_order_amount)}</strong></div>
                          {voucher.max_discount && voucher.discount_type === 'percentage' ? (
                            <div>Maks Potongan: <strong className="text-white">{formatRupiah(voucher.max_discount)}</strong></div>
                          ) : null}
                        </div>
                      </td>

                      {/* Usage details */}
                      <td className="p-4 font-sans text-slate-400">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-white">
                            {voucher.used_count} <span className="text-[10px] text-slate-500 font-normal">dipakai</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Batas: {voucher.usage_limit ? `${voucher.usage_limit} kali` : 'Tak Terbatas'}
                          </span>
                        </div>
                      </td>

                      {/* Validity Period */}
                      <td className="p-4 font-mono text-[10px] text-slate-400 leading-normal">
                        <div>Mulai: {formatDate(voucher.start_date)}</div>
                        <div className={expired ? 'text-rose-400' : 'text-slate-400'}>
                          Selesai: {formatDate(voucher.end_date)}
                        </div>
                      </td>

                      {/* Active Status */}
                      <td className="p-4 text-center">
                        {expired ? (
                          <span className="bg-rose-900/30 text-rose-400 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full border border-rose-800/25 uppercase tracking-wider font-sans">
                            KADALUARSA
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(voucher)}
                            className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer border ${
                              voucher.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border-emerald-500/20'
                                : 'bg-slate-950 text-slate-500 hover:text-slate-300 border-slate-800'
                            }`}
                          >
                            {voucher.is_active ? 'AKTIF' : 'MATI'}
                          </button>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        {deleteConfirmId === voucher.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDeleteVoucher(voucher.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(voucher.id)}
                            className="p-1.5 bg-slate-950 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer border border-slate-850"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Voucher Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/50 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Ticket className="w-4 h-4 animate-pulse" />
              </div>
              <h2 className="text-base font-black text-white">Buat Voucher Baru</h2>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs">
              {/* Code */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Kode Voucher *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: HEMATBANYAK"
                    className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase tracking-wider focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-lg transition-all"
                  >
                    Acak
                  </button>
                </div>
              </div>

              {/* Name / Campaign Title */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Nama Voucher / Kampanye *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Diskon Makan Siang Nikmat"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Tipe Diskon *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percentage');
                      setDiscountValue('10');
                      setMaxDiscount('');
                    }}
                    className={`p-2 rounded-lg border font-bold transition-all text-center ${
                      discountType === 'percentage'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-450'
                        : 'bg-slate-955 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Persentase (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('fixed');
                      setDiscountValue('15000');
                      setMaxDiscount('');
                    }}
                    className={`p-2 rounded-lg border font-bold transition-all text-center ${
                      discountType === 'fixed'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-455'
                        : 'bg-slate-955 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Nominal Tetap (Rp)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                  {discountType === 'percentage' ? 'Nilai Diskon Persen (%) *' : 'Nominal Diskon Rupiah (Rp) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={discountType === 'percentage' ? '100' : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '10' : '15000'}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Min Purchase */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Min. Belanja (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                {/* Max Discount Cap (Conditional) */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                    {discountType === 'percentage' ? 'Maks Diskon (Rp)' : 'Maks Diskon (N/A)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={discountType !== 'percentage'}
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Contoh: 15000"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs text-center font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Tanggal Selesai *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs text-center font-sans"
                  />
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Kuota Maks Penggunaan (Opsional)</label>
                <input
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Kosongkan untuk tanpa batas kuota"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* Modal CTA */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-2/3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : 'Simpan Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
