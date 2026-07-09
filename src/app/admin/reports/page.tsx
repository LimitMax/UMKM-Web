'use client';

import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RotateCcw, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Package, 
  Award,
  CreditCard,
  Calendar,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { orderService } from '../../../services/orderService';
import { businessService } from '../../../services/businessService';
import { Order, BusinessProfile } from '../../../types';
import { formatRupiah, formatDate } from '../../../utils/format';
import { 
  ReportFilters, 
  filterOrders, 
  calculateReportSummary, 
  generateCSVReport 
} from '../../../utils/reportHelpers';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  // Helper date generators
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFirstDayOfMonthString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // State filters initialized to default behavior
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: getFirstDayOfMonthString(),
    endDate: getTodayString(),
    orderStatus: 'Active', // Excludes Cancelled by default
    paymentStatus: 'All',
    paymentMethod: 'All',
  });

  // Derived state computed during render
  const filteredOrders = filterOrders(orders, filters);
  const summary = calculateReportSummary(filteredOrders);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const allOrders = await orderService.getOrders();
        setOrders(allOrders);
        const profile = await businessService.getProfile();
        setBusinessProfile(profile);
      } catch (err) {
        console.error('Error loading report orders:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: getFirstDayOfMonthString(),
      endDate: getTodayString(),
      orderStatus: 'Active',
      paymentStatus: 'All',
      paymentMethod: 'All',
    });
    showToast('success', 'Filter berhasil diset ke kondisi bawaan.');
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0 || !businessProfile) {
      showToast('error', 'Tidak ada data untuk diekspor.');
      return;
    }

    try {
      const csvContent = generateCSVReport(filteredOrders, businessProfile);
      
      // UTF-8 BOM to display standard characters properly in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate clean filename
      let filename = 'umkm-pilot-transactions';
      if (filters.startDate && filters.endDate) {
        filename += `-${filters.startDate}-to-${filters.endDate}`;
      } else if (filters.startDate) {
        filename += `-from-${filters.startDate}`;
      } else if (filters.endDate) {
        filename += `-until-${filters.endDate}`;
      } else {
        filename += `-${getTodayString()}`;
      }
      filename += '.csv';
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('success', `Laporan berhasil diekspor sebagai ${filename}!`);
    } catch {
      showToast('error', 'Gagal mengekspor laporan CSV.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-mono animate-pulse">Memuat laporan transaksi...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-2xl max-w-sm ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-950/90 border-rose-500/30 text-rose-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-xs font-medium leading-relaxed">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Laporan & Ekspor Data</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analisis penjualan, ringkasan pembayaran, dan ekspor spreadsheet transaksi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetFilters}
            type="button"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 hover:border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            type="button"
            disabled={filteredOrders.length === 0}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-950/50 disabled:border-slate-900 disabled:text-slate-650 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="glass rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-4">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          <span>Filter Laporan</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>Tanggal Mulai</span>
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>Tanggal Selesai</span>
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Order Status */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Status Pesanan</label>
            <select
              value={filters.orderStatus}
              onChange={(e) => setFilters({ ...filters, orderStatus: e.target.value })}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Active">Semua Aktif (Kecuali Batal)</option>
              <option value="All">Semua Status (Termasuk Batal)</option>
              <option value="Waiting for Payment">Menunggu Pembayaran</option>
              <option value="Paid">Lunas (Antrean Dapur)</option>
              <option value="Processing">Sedang Diproses</option>
              <option value="Ready">Siap Disajikan / Dikirim / Diambil</option>
              <option value="delivering">Sedang Dikirim</option>
              <option value="Completed">Selesai</option>
              <option value="Cancelled">Dibatalkan</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Status Pembayaran</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Semua Status</option>
              <option value="Pending">Belum Bayar</option>
              <option value="Paid">Lunas</option>
              <option value="Failed">Gagal</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Metode Pembayaran</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Semua Metode</option>
              <option value="Cash">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="Bank Transfer">Transfer Bank</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="glass p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-6 -translate-y-6" />
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Total Omzet</p>
            <p className="text-lg font-bold text-white mt-0.5">{formatRupiah(summary.totalRevenue)}</p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="glass p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full translate-x-6 -translate-y-6" />
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Jumlah Pesanan</p>
            <p className="text-lg font-bold text-white mt-0.5">{summary.totalOrders} Pesanan</p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="glass p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full translate-x-6 -translate-y-6" />
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Nilai Rata-rata</p>
            <p className="text-lg font-bold text-white mt-0.5">{formatRupiah(summary.averageOrderValue)}</p>
          </div>
        </div>

        {/* Items Sold */}
        <div className="glass p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full translate-x-6 -translate-y-6" />
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Total Item Terjual</p>
            <p className="text-lg font-bold text-white mt-0.5">{summary.totalItemsSold} Unit</p>
          </div>
        </div>
      </div>

      {/* Secondary Insight Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Payment Methods breakdown */}
        <div className="glass rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-4">
          <h3 className="text-xs font-mono text-slate-450 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rincian Pembayaran</span>
          </h3>

          <div className="flex flex-col gap-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Tunai (Cash):</span>
              <span className="text-xs font-bold text-slate-200">{formatRupiah(summary.paymentMethodBreakdown.cash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">QRIS:</span>
              <span className="text-xs font-bold text-slate-200">{formatRupiah(summary.paymentMethodBreakdown.qris)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Transfer Bank:</span>
              <span className="text-xs font-bold text-slate-200">{formatRupiah(summary.paymentMethodBreakdown.transfer)}</span>
            </div>
          </div>
        </div>

        {/* Best seller info */}
        <div className="glass rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-4">
          <h3 className="text-xs font-mono text-slate-450 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Produk Terlaris</span>
          </h3>

          <div className="flex-1 flex flex-col justify-center items-center py-2 text-center">
            {summary.bestSellerName !== '-' ? (
              <>
                <p className="text-sm font-bold text-emerald-400 uppercase tracking-tight">{summary.bestSellerName}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Terjual sebanyak: {summary.bestSellerQty} porsi</p>
              </>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Tidak ada data penjualan</p>
            )}
          </div>
        </div>

        {/* Local Storage details */}
        <div className="glass rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-4">
          <h3 className="text-xs font-mono text-slate-450 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Catatan Sistem</span>
          </h3>

          <div className="text-[10.5px] text-slate-400 leading-normal flex flex-col gap-2 font-mono">
            <p>
              * Omzet dihitung dari total harga akhir (termasuk pajak daerah PPN & biaya layanan).
            </p>
            <p>
              * Data diambil dari database lokal browser (<span className="text-emerald-400">localStorage</span>).
            </p>
          </div>
        </div>

      </div>

      {/* Transaction Preview Table */}
      <div className="glass rounded-2xl border border-slate-800/80 p-5">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-850 pb-2 flex justify-between items-center">
          <span>Pratinjau Data Transaksi ({filteredOrders.length})</span>
          {filteredOrders.length > 0 && (
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
              Siap Ekspor
            </span>
          )}
        </h3>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-slate-700" />
            <p className="text-xs text-slate-400 font-mono">Tidak ada transaksi yang cocok dengan filter</p>
            <p className="text-[10px] text-slate-500">Silakan ubah tanggal atau pilihan filter Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">Antrean</th>
                  <th className="py-2.5 px-2">ID Pesanan</th>
                  <th className="py-2.5 px-2">Nama</th>
                  <th className="py-2.5 px-2">Tanggal</th>
                  <th className="py-2.5 px-2 text-center">Metode</th>
                  <th className="py-2.5 px-2 text-center">Pembayaran</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredOrders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-900/40 transition-all">
                    <td className="py-2.5 px-3 font-bold text-white text-xs">{order.queueNumber}</td>
                    <td className="py-2.5 px-2 text-slate-500">{order.id.slice(6, 14).toUpperCase()}</td>
                    <td className="py-2.5 px-2 text-slate-200 uppercase font-semibold">{order.customerName}</td>
                    <td className="py-2.5 px-2">{formatDate(order.createdAt)}</td>
                    <td className="py-2.5 px-2 text-center text-[10px]">
                      {order.paymentMethod === 'Cash' ? 'Tunai' : order.paymentMethod === 'Bank Transfer' ? 'Transfer' : 'QRIS'}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        order.paymentStatus === 'Paid' 
                          ? 'bg-emerald-950/50 border border-emerald-900 text-emerald-400' 
                          : 'bg-amber-950/50 border border-amber-900 text-amber-400'
                      }`}>
                        {order.paymentStatus === 'Paid' ? 'LUNAS' : 'PENDING'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{formatRupiah(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOrders.length > 10 && (
              <p className="text-[10px] text-center text-slate-500 mt-4 italic font-sans">
                Menampilkan 10 dari {filteredOrders.length} transaksi. Klik &quot;Ekspor CSV&quot; untuk melihat seluruh rincian.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
