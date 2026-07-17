'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  Users,
  Search,
  Percent,
  Ticket,
  Gift,
  X,
  Info,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';

interface CouponRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
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
  if (!dateStr) return 'Selamanya';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function PlatformCouponsPage() {
  const { user: supabaseUser } = useAuth();

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch('/api/platform/coupons', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memuat daftar kupon.');
      }

      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const timer = setTimeout(() => {
        loadCoupons();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [supabaseUser, loadCoupons]);

  const generateRandomCode = () => {
    const prefixes = ['PROMO', 'HEBOH', 'UMKM', 'DISKON', 'SAAS', 'CAMP'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(10 + Math.random() * 90); // 2 digits
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCode(`${randomPrefix}${randomStr}${randomNum}`);
  };

  const openCreateModal = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setMaxUses('');
    setExpiresAt('');
    setIsActive(true);
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const payload = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
        is_active: isActive,
      };

      const res = await fetch('/api/platform/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || 'Gagal membuat kupon.');
      }

      setSuccessMsg(resData.message || 'Kupon berhasil dibuat!');
      setModalOpen(false);
      loadCoupons();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (coupon: CouponRow) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal merubah status kupon.');
      }

      setSuccessMsg(`Status kupon ${coupon.code} berhasil diperbarui.`);
      loadCoupons();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal merubah status kupon.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`/api/platform/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal menghapus kupon.');
      }

      setSuccessMsg('Kupon berhasil dihapus.');
      setDeleteConfirmId(null);
      loadCoupons();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus kupon.');
    } finally {
      setActionLoading(false);
    }
  };

  const [nowTime] = useState(() => Date.now());

  const isExpired = (expiryStr: string | null) => {
    if (!expiryStr) return false;
    return new Date(expiryStr).getTime() < nowTime;
  };

  // Filtered coupons calculations
  const filtered = coupons.filter(c => {
    const codeMatch = c.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    let typeMatch = true;
    if (typeFilter !== 'all') {
      typeMatch = c.discount_type === typeFilter;
    }

    let statusMatch = true;
    if (statusFilter === 'active') {
      statusMatch = c.is_active && !isExpired(c.expires_at);
    } else if (statusFilter === 'inactive') {
      statusMatch = !c.is_active;
    } else if (statusFilter === 'expired') {
      statusMatch = isExpired(c.expires_at);
    }

    return codeMatch && typeMatch && statusMatch;
  });

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active && !isExpired(c.expires_at)).length;
  const totalUses = coupons.reduce((acc, curr) => acc + (curr.used_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-violet-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              PLATFORM PROMO
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Kupon & Promo Campaign</h1>
          <p className="text-xs text-slate-400 mt-1">Buat, kelola, dan pantau kampanye kupon diskon langganan merchant</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg hover:shadow-violet-600/10 cursor-pointer border-none"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kupon Baru</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-350 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-350 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1 */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Ticket className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Kupon</p>
            <p className="text-xl font-black text-white mt-0.5">{totalCoupons}</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Kupon Aktif</p>
            <p className="text-xl font-black text-white mt-0.5">{activeCoupons}</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Penggunaan</p>
            <p className="text-xl font-black text-white mt-0.5">{totalUses} Kali</p>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-900/40 p-4 border border-slate-850 rounded-2xl">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-650">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan kode promo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'percentage' | 'fixed')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-violet-500"
          >
            <option value="all">Semua Tipe Diskon</option>
            <option value="percentage">Persentase (%)</option>
            <option value="fixed">Nominal Tetap (Rp)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'expired')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-violet-500"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="expired">Kedaluwarsa</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          <span className="text-xs font-mono">Memuat daftar kupon...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-850 rounded-2xl bg-slate-900/5">
          <Tag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-bold text-sm font-sans">Tidak ada kupon diskon ditemukan</p>
          <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">Mulai buat kampanye voucher promo dengan menekan tombol Buat Kupon Baru di atas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-900/5">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 font-mono text-slate-500 uppercase text-[9px] tracking-wider bg-slate-900/20">
                <th className="p-4">Kode Kupon</th>
                <th className="p-4 text-center">Tipe</th>
                <th className="p-4 text-right">Potongan Diskon</th>
                <th className="p-4 text-center">Batas Penggunaan</th>
                <th className="p-4 text-center">Jumlah Dipakai</th>
                <th className="p-4">Tanggal Kedaluwarsa</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((coupon) => {
                const expired = isExpired(coupon.expires_at);
                const reachedLimit = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;

                return (
                  <tr key={coupon.id} className="border-b border-slate-850/50 hover:bg-slate-900/10 transition-colors">
                    {/* Code */}
                    <td className="p-4 font-mono font-bold text-white tracking-wide uppercase">
                      {coupon.code}
                    </td>

                    {/* Type */}
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        coupon.discount_type === 'percentage' 
                          ? 'bg-violet-950/40 text-violet-400 border border-violet-850'
                          : 'bg-teal-950/40 text-teal-400 border border-teal-850'
                      }`}>
                        {coupon.discount_type === 'percentage' ? 'Persen' : 'Nominal'}
                      </span>
                    </td>

                    {/* Discount Value */}
                    <td className="p-4 text-right font-mono font-bold text-white">
                      {coupon.discount_type === 'percentage' 
                        ? `${coupon.discount_value}%`
                        : formatRupiah(coupon.discount_value)
                      }
                    </td>

                    {/* Limit */}
                    <td className="p-4 text-center font-mono text-slate-300">
                      {coupon.max_uses !== null ? `${coupon.max_uses} kali` : 'Tak Terbatas'}
                    </td>

                    {/* Used Count */}
                    <td className="p-4 text-center font-mono font-semibold text-slate-350">
                      {coupon.used_count || 0}
                    </td>

                    {/* Expiry */}
                    <td className="p-4 font-mono text-slate-350">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{formatDate(coupon.expires_at)}</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="p-4 text-center">
                      {expired ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950/40 text-rose-450 border border-rose-900/35">
                          Expired
                        </span>
                      ) : reachedLimit ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950/40 text-amber-450 border border-amber-900/35">
                          Limit Habis
                        </span>
                      ) : coupon.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/35">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-500 border border-slate-800">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Toggle active button */}
                        {!expired && (
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              coupon.is_active
                                ? 'bg-slate-950 text-amber-400 border-amber-900/40 hover:bg-amber-950/20'
                                : 'bg-violet-600 text-white border-violet-700 hover:bg-violet-500'
                            }`}
                            title={coupon.is_active ? 'Nonaktifkan kupon' : 'Aktifkan kupon'}
                          >
                            {coupon.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => setDeleteConfirmId(coupon.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer border-none bg-transparent"
                          title="Hapus Kupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white font-sans">Hapus Kupon Promo</h3>
              <p className="text-xs text-slate-400 mt-2 leading-normal font-sans">
                Apakah Anda yakin ingin menghapus kupon diskon ini secara permanen? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-xs border border-slate-700 font-sans cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => deleteConfirmId && handleDeleteCoupon(deleteConfirmId)}
                className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-bold rounded-xl transition-all text-xs border-none font-sans cursor-pointer flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Hapus</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4.5 h-4.5 text-violet-400" />
                <h3 className="text-sm font-bold text-white font-sans">Buat Kupon Baru</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="flex flex-col gap-4">
              {/* Promo Code */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Kode Kupon / Voucher</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PROMOHEBOH50"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-violet-500 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-violet-400 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    Acak Kode
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 mt-1.5">Biarkan kosong untuk menghasilkan kode acak secara otomatis.</p>
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Tipe Diskon Potongan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percentage');
                      setDiscountValue(10);
                    }}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                      discountType === 'percentage'
                        ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/10'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Persentase (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('fixed');
                      setDiscountValue(50000);
                    }}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                      discountType === 'fixed'
                        ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/10'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-[10px]">Rp</span>
                    <span>Nominal Tetap</span>
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                  {discountType === 'percentage' ? 'Nilai Persentase Diskon (%)' : 'Nilai Potongan Nominal (IDR)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'percentage' ? 100 : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 font-mono text-xs">
                    {discountType === 'percentage' ? '%' : 'Rupiah'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Max Uses */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Batas Kuota Penggunaan</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Selamanya"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <p className="text-[8px] text-slate-500 mt-1">Kosongkan jika kupon bebas dipakai berkali-kali.</p>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Masa Berlaku Kedaluwarsa</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono text-left"
                  />
                  <p className="text-[8px] text-slate-500 mt-1">Kosongkan jika kupon tidak ada masa kedaluwarsa.</p>
                </div>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850 mt-2">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-white">Aktifkan Kupon Langsung</p>
                    <p className="text-[8px] text-slate-550">Kupon dapat langsung digunakan setelah dibuat.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-slate-950 border-slate-800 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 border-t border-slate-800/60 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white font-bold rounded-xl transition-all text-xs border border-slate-700 font-sans cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-900 disabled:to-indigo-900 text-white font-bold rounded-xl transition-all text-xs border-none font-sans cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Buat Kupon</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
