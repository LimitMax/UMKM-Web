'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  RotateCcw,
  Trash2,
  PackageOpen,
  Zap,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Package,
  ShoppingCart,
  DollarSign,
  ListOrdered,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { demoService, DemoStats, GenerateResult } from '../../../services/demoService';
import { formatRupiah } from '../../../utils/format';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmConfig {
  title: string;
  description: string;
  consequences: string[];
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = useCallback(() => {
    const s = demoService.getStats();
    setStats(s);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleRefreshStats = () => {
    setIsRefreshing(true);
    loadStats();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const runAction = (action: () => void | GenerateResult, successMsg: string) => {
    setIsActionLoading(true);
    setConfirm(null);
    try {
      action();
      loadStats();
      showToast('success', successMsg);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Action Handlers ──────────────────────────────────────────────────────

  const handleResetAll = () => {
    setConfirm({
      title: 'Reset Semua Data',
      description:
        'Anda akan menghapus SELURUH pesanan dan mengembalikan katalog produk ke kondisi awal (7 produk seed). Tindakan ini TIDAK DAPAT dibatalkan.',
      consequences: [
        'Seluruh riwayat pesanan dihapus permanen',
        'Semua statistik dashboard kembali ke nol',
        'Katalog produk dikembalikan ke 7 produk seed',
        'Stok semua produk dikembalikan ke nilai awal',
        'Nomor antrean direset dari A001',
      ],
      confirmLabel: 'Ya, Reset Semua Data',
      variant: 'danger',
      onConfirm: () =>
        runAction(() => {
          demoService.resetAll();
        }, 'Semua data berhasil direset ke kondisi awal.'),
    });
  };

  const handleClearOrders = () => {
    setConfirm({
      title: 'Bersihkan Semua Pesanan',
      description:
        'Seluruh riwayat pesanan akan dihapus. Data katalog produk dan stok tidak akan terpengaruh.',
      consequences: [
        'Seluruh pesanan (aktif, selesai, batal) dihapus',
        'Statistik dashboard omzet menjadi nol',
        'Antrean kasir dikosongkan',
        'Nomor antrean direset dari A001',
      ],
      confirmLabel: 'Ya, Bersihkan Pesanan',
      variant: 'warning',
      onConfirm: () =>
        runAction(() => {
          demoService.clearOrders();
        }, 'Semua pesanan berhasil dibersihkan.'),
    });
  };

  const handleRestoreProducts = () => {
    setConfirm({
      title: 'Pulihkan Katalog Produk',
      description:
        'Katalog produk akan dikembalikan ke 7 produk seed awal. Riwayat pesanan tidak akan terpengaruh, namun referensi produk yang sudah dihapus mungkin tidak sinkron.',
      consequences: [
        'Produk yang sudah ditambahkan secara manual akan hilang',
        'Semua stok produk dikembalikan ke nilai seed',
        'Perubahan harga/nama yang sudah dilakukan akan hilang',
      ],
      confirmLabel: 'Ya, Pulihkan Produk',
      variant: 'info',
      onConfirm: () =>
        runAction(() => {
          demoService.restoreProducts();
        }, '7 produk seed berhasil dipulihkan ke kondisi awal.'),
    });
  };

  const handleGenerateSampleOrders = () => {
    setConfirm({
      title: 'Buat Pesanan Contoh',
      description:
        'Akan dibuat 8 pesanan demo dengan berbagai status (selesai, aktif, menunggu, batal). Semua data saat ini AKAN DITIMPA untuk memastikan konsistensi.',
      consequences: [
        '8 pesanan baru dibuat untuk hari ini',
        'Katalog produk dikembalikan ke 7 produk seed',
        'Stok produk dikurangi sesuai pesanan aktif',
        'Omzet demo hari ini: ≈ Rp 207.000',
        'Antrean kasir aktif: 4 pesanan (Paid, Diproses, Siap, Menunggu)',
      ],
      confirmLabel: 'Ya, Generate Pesanan Demo',
      variant: 'success',
      onConfirm: () =>
        runAction(() => {
          const result = demoService.generateSampleOrders();
          return result;
        }, '8 pesanan demo berhasil dibuat! Dashboard, kasir, dan stok kini terisi data contoh.'),
    });
  };

  const handleSetLowStock = () => {
    setConfirm({
      title: 'Simulasi Stok Kritis',
      description:
        'Akan mengatur 3 produk ke stok sangat sedikit (2–4 unit) untuk menguji tampilan peringatan stok di halaman dashboard dan stok.',
      consequences: [
        'Es Kopi Susu Gula Aren → 4 unit',
        'Roti Bakar Cokelat Keju → 3 unit',
        'Paket Kenyang A → 2 unit',
        'Peringatan stok kritis akan muncul di dashboard admin',
      ],
      confirmLabel: 'Ya, Simulasikan Stok Kritis',
      variant: 'warning',
      onConfirm: () =>
        runAction(() => {
          demoService.setLowStockDemo();
        }, 'Simulasi stok kritis berhasil. Cek halaman Kelola Stok dan Ringkasan Admin.'),
    });
  };

  // ── Variant Styling Helpers ──────────────────────────────────────────────

  const variantStyles = {
    danger: {
      button: 'bg-rose-600 hover:bg-rose-500 text-white',
      icon: 'text-rose-400',
      iconBg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    warning: {
      button: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      icon: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    info: {
      button: 'bg-blue-600 hover:bg-blue-500 text-white',
      icon: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    success: {
      button: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
      icon: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
  };

  return (
    <div className="flex flex-col gap-6 relative">

      {/* ── Toast Notification ─────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm flex items-start gap-3 p-4 rounded-2xl shadow-2xl border transition-all ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900 border-rose-500/30 text-rose-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-xs text-slate-200 leading-relaxed">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-white ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-emerald-400" />
            <span>Alat Demo &amp; Pengembangan</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola data demo untuk keperluan pengujian, presentasi, dan demonstrasi fitur aplikasi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Mode Demo Aktif
          </span>
        </div>
      </div>

      {/* ── Live Data Stats ────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
            Status Data Saat Ini
          </span>
          <button
            onClick={handleRefreshStats}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-emerald-400 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Perbarui</span>
          </button>
        </div>

        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Products */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Produk</span>
              </div>
              <span className="text-xl font-black text-white">{stats.totalProducts}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold">
                  {stats.activeProducts} aktif
                </span>
                {stats.lowStockCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15 font-bold">
                    {stats.lowStockCount} menipis
                  </span>
                )}
                {stats.outOfStockCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/15 font-bold">
                    {stats.outOfStockCount} habis
                  </span>
                )}
              </div>
            </div>

            {/* Orders */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Total Pesanan</span>
              </div>
              <span className="text-xl font-black text-white">{stats.totalOrders}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                  {stats.todayOrdersCount} hari ini
                </span>
              </div>
            </div>

            {/* Active Queue */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                  <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Antrean Aktif</span>
              </div>
              <span className="text-xl font-black text-white">{stats.activeOrdersCount}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold">
                  {stats.completedOrdersCount} selesai
                </span>
                {stats.cancelledOrdersCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 font-bold">
                    {stats.cancelledOrdersCount} batal
                  </span>
                )}
              </div>
            </div>

            {/* Revenue */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Omzet Hari Ini</span>
              </div>
              <span className="text-xl font-black text-emerald-400">
                {stats.todayRevenue > 0 ? formatRupiah(stats.todayRevenue) : '—'}
              </span>
              <span className="text-[9px] text-slate-600 mt-1">pesanan lunas + selesai</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {/* ── ZONE: Aksi Berbahaya ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-850" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-3">
            Aksi Berbahaya
          </span>
          <div className="h-px flex-1 bg-slate-850" />
        </div>
        <p className="text-[11px] text-slate-500 text-center">
          Tindakan di bawah bersifat permanen dan tidak dapat dibatalkan.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reset All */}
          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-4.5 h-4.5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reset Semua Data</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Hapus seluruh pesanan dan kembalikan 7 produk seed ke kondisi awal. Cocok untuk memulai demo dari awal.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetAll}
              disabled={isActionLoading}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Semua Data
            </button>
          </div>

          {/* Clear Orders */}
          <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Bersihkan Semua Pesanan</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Hapus seluruh riwayat pesanan dan antrean kasir. Katalog produk dan stok tidak terpengaruh.
                </p>
              </div>
            </div>
            <button
              onClick={handleClearOrders}
              disabled={isActionLoading}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Bersihkan Pesanan
            </button>
          </div>
        </div>
      </div>

      {/* ── ZONE: Generate Demo Data ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-850" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-3">
            Generate Data Demo
          </span>
          <div className="h-px flex-1 bg-slate-850" />
        </div>
        <p className="text-[11px] text-slate-500 text-center">
          Isi database dengan data contoh yang realistis untuk demonstrasi dan pengujian.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Generate Sample Orders */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Buat Pesanan Contoh</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Generate 8 pesanan demo dengan berbagai status untuk hari ini. Akan mengisi dashboard, kasir, transaksi, dan insight dengan data yang realistis.
                </p>
              </div>
            </div>

            {/* What you get preview */}
            <div className="bg-slate-950/40 rounded-xl border border-slate-900 p-3 flex flex-col gap-1.5">
              <span className="text-[9px] font-mono text-emerald-400/80 uppercase font-bold tracking-widest mb-1">
                Yang akan dibuat:
              </span>
              {[
                { label: '3 pesanan Selesai', sub: 'Omzet +Rp 132.000', color: 'text-emerald-400' },
                { label: '3 pesanan Aktif (Bayar/Proses/Siap)', sub: 'Antrean kasir', color: 'text-blue-400' },
                { label: '1 pesanan Menunggu Pembayaran', sub: 'Queue baru', color: 'text-amber-400' },
                { label: '1 pesanan Dibatalkan', sub: 'Stok dikembalikan', color: 'text-slate-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ChevronRight className={`w-3 h-3 flex-shrink-0 ${item.color}`} />
                  <span className="text-[10px] text-slate-300 font-semibold">{item.label}</span>
                  <span className="text-[9px] text-slate-600">{item.sub}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerateSampleOrders}
              disabled={isActionLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Pesanan Demo
            </button>
          </div>

          {/* Low Stock Simulation */}
          <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Simulasi Stok Kritis</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Set beberapa produk ke stok sangat sedikit (2–4 unit) untuk menguji tampilan peringatan stok di dashboard dan halaman stok.
                </p>
              </div>
            </div>

            {/* Affected products preview */}
            <div className="bg-slate-950/40 rounded-xl border border-slate-900 p-3 flex flex-col gap-1.5">
              <span className="text-[9px] font-mono text-amber-400/80 uppercase font-bold tracking-widest mb-1">
                Produk yang diubah:
              </span>
              {[
                { name: 'Es Kopi Susu Gula Aren', stock: '4 unit' },
                { name: 'Roti Bakar Cokelat Keju', stock: '3 unit' },
                { name: 'Paket Kenyang A', stock: '2 unit' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="text-[10px] text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400">{item.stock}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSetLowStock}
              disabled={isActionLoading}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Simulasikan Stok Kritis
            </button>
          </div>
        </div>
      </div>

      {/* ── ZONE: Pemulihan Data ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-850" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-3">
            Pemulihan Data
          </span>
          <div className="h-px flex-1 bg-slate-850" />
        </div>

        <div className="bg-blue-950/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <PackageOpen className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pulihkan Katalog Produk</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Kembalikan 7 produk seed ke kondisi awal beserta stok semula. Riwayat pesanan tidak akan terhapus.
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {['Es Kopi Susu', 'Nasi Geprek', 'Mie Goreng', 'Roti Bakar', 'Es Teh', 'Kopi Hitam', 'Paket Kenyang'].map(
                  (name) => (
                    <span
                      key={name}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
                    >
                      {name}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleRestoreProducts}
            disabled={isActionLoading}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all flex items-center gap-2 w-full sm:w-auto"
          >
            <PackageOpen className="w-3.5 h-3.5" />
            Pulihkan Produk
          </button>
        </div>
      </div>

      {/* ── Info Footer ───────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-850 text-[11px] text-slate-500 leading-relaxed">
        <strong className="text-slate-400">Catatan:</strong> Semua perubahan memengaruhi localStorage browser secara langsung. Segarkan halaman Admin Dashboard, Kasir, Transaksi, dan AI Insights setelah melakukan aksi di atas untuk melihat perubahan.
      </div>

      {/* ── Confirmation Modal ────────────────────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">

            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${variantStyles[confirm.variant].iconBg}`}
                >
                  {confirm.variant === 'danger' && <RotateCcw className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                  {confirm.variant === 'warning' && <AlertTriangle className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                  {confirm.variant === 'info' && <PackageOpen className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                  {confirm.variant === 'success' && <Zap className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                </div>
                <h3 className="text-sm font-extrabold text-white">{confirm.title}</h3>
              </div>
              <button
                onClick={() => setConfirm(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 leading-relaxed">{confirm.description}</p>

            {/* Consequences list */}
            {confirm.consequences.length > 0 && (
              <div className={`p-3 rounded-xl border ${variantStyles[confirm.variant].border} bg-slate-950/30 flex flex-col gap-2`}>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Yang akan terjadi:
                </span>
                {confirm.consequences.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 mt-0.5 ${variantStyles[confirm.variant].icon}`} />
                    <span className="text-[11px] text-slate-300">{c}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Batal
              </button>
              <button
                onClick={confirm.onConfirm}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${variantStyles[confirm.variant].button}`}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
