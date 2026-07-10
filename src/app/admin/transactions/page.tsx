'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  DollarSign, 
  CreditCard, 
  User, 
  Phone, 
  Clock, 
  FileText,
  Briefcase,
  ShoppingBag
} from 'lucide-react';
import { orderService } from '../../../services/orderService';
import { Order } from '../../../types';
import { formatRupiah, formatDate } from '../../../utils/format';
import { formatPaymentMethod, formatPaymentProvider, formatMidtransPaymentType } from '../../../utils/paymentHelpers';

import { useAuth } from '../../../components/AuthProvider';
import { realtimeService } from '../../../lib/services/realtimeService';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('Semua');
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) return;

    const bizId = profile.business_id || 'biz-1';
    let debounceTimer: NodeJS.Timeout;

    const loadTx = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Admin fetching transactions for business_id: ${bizId}`);
      }

      const data = await orderService.getCompletedTransactions(bizId);
      setTransactions(data);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Admin fetched transactions count: ${data.length}`);
      }
    };

    // Initial load
    loadTx();

    const triggerReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadTx, 500); // 500ms debounce
    };

    // Subscribe to realtime orders and transactions
    const channelOrders = realtimeService.subscribeToOrdersByBusinessId(bizId, (payload) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Admin transactions order change event:', payload.eventType);
      }
      triggerReload();
    });

    const channelTx = realtimeService.subscribeToTransactionsByBusinessId(bizId, (payload) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Admin transactions transaction change event:', payload.eventType);
      }
      triggerReload();
    });

    return () => {
      clearTimeout(debounceTimer);
      realtimeService.unsubscribeChannel(channelOrders);
      realtimeService.unsubscribeChannel(channelTx);
    };
  }, [profile]);

  // Filtered transactions list
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.queueNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;

    if (methodFilter !== 'Semua') {
      return tx.paymentMethod === methodFilter;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first

  // Selected Transaction details
  const selectedTx = filteredTransactions.find((t) => t.id === selectedTxId) || (filteredTransactions.length > 0 ? filteredTransactions[0] : null);

  // Totals calculations
  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
  const totalCount = filteredTransactions.length;
  const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white">Riwayat Transaksi Penjualan</h1>
        <p className="text-xs text-slate-400 mt-1">Audit transaksi yang telah dibayar dan selesai. Gunakan pencarian untuk melacak pesanan lama.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Total Transaksi</span>
            <span className="text-white font-black text-lg">{totalCount} Pembayaran</span>
          </div>
          <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800 text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Total Pendapatan Terfilter</span>
            <span className="text-emerald-400 font-black text-lg">{formatRupiah(totalRevenue)}</span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/10 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Rata-Rata Tiket</span>
            <span className="text-white font-black text-lg">{formatRupiah(avgTicket)}</span>
          </div>
          <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800 text-slate-400">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor antrean (A001) atau nama pelanggan..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['Semua', 'Cash', 'Non-Cash'].map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                methodFilter === method
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/25'
                  : 'bg-slate-900/50 text-slate-400 border border-slate-855 hover:text-white'
              }`}
            >
              {method === 'Cash' ? 'Tunai' : method === 'Non-Cash' ? 'Non-Tunai' : method}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger split screen */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Ledger List */}
        <div className="flex-1 flex flex-col gap-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-850 rounded-2xl">
              <p className="text-slate-500 text-xs">Tidak ada transaksi yang terdaftar.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredTransactions.map((tx) => {
                const isSelected = selectedTx?.id === tx.id;
                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/50 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-900/40 border-slate-900 hover:border-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Queue Circle */}
                      <span className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center font-mono font-bold text-sm text-emerald-400">
                        {tx.queueNumber}
                      </span>
                      
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-xs text-white">{tx.customerName}</h4>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                            tx.fulfillmentType === 'delivery'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : tx.fulfillmentType === 'pickup'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {tx.fulfillmentType === 'delivery' ? 'Deliv' : tx.fulfillmentType === 'pickup' ? 'Ambil' : 'Meja'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {formatDate(tx.createdAt)} &bull; {formatPaymentMethod(tx.paymentMethod)}
                          {tx.paymentMethod !== 'Cash' ? ' via Midtrans' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-xs text-emerald-400">{formatRupiah(tx.totalAmount)}</span>
                      <span className="block text-[9px] text-emerald-500/80 font-mono tracking-widest uppercase mt-0.5">LUNAS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Tx Detail Card */}
        <div className="w-full lg:w-96 bg-slate-900 border border-slate-850 rounded-2xl p-6 h-fit lg:sticky lg:top-24 flex flex-col gap-5">
          {selectedTx ? (
            <>
              {/* Header */}
              <div className="border-b border-slate-850 pb-4">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Detail Pembayaran</span>
                <div className="flex justify-between items-center mt-1">
                  <h3 className="text-2xl font-black text-white">{selectedTx.queueNumber}</h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[9px] font-black tracking-wide">
                    LUNAS
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-1">ID: {selectedTx.id.toUpperCase()}</p>
              </div>

              {/* Customer Meta info */}
              <div className="flex flex-col gap-2 p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nama: <strong className="text-white">{selectedTx.customerName}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Telepon: <strong className="text-white">{selectedTx.customerPhone}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Metode: <strong className="text-white">{formatPaymentMethod(selectedTx.paymentMethod)}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>Provider: <strong className="text-white">{formatPaymentProvider(selectedTx.paymentProvider, selectedTx.paymentMethod)}</strong></span>
                </div>
                {selectedTx.paymentChannel && (
                  <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Channel: <strong className="text-white">{formatMidtransPaymentType(selectedTx.paymentChannel)}</strong></span>
                  </div>
                )}
                {selectedTx.providerReferenceId && (
                  <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] truncate max-w-[280px]">Ref ID: <strong className="text-slate-300 font-mono text-[9.5px]">{selectedTx.providerReferenceId}</strong></span>
                  </div>
                )}
                {selectedTx.paidAt && (
                  <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Waktu Bayar: <strong className="text-white">{formatDate(selectedTx.paidAt)}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Selesai: <strong className="text-white">{formatDate(selectedTx.createdAt)}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                  <span>Layanan: <strong className="text-white">
                    {selectedTx.fulfillmentType === 'delivery' ? 'Delivery' : selectedTx.fulfillmentType === 'pickup' ? 'Ambil Sendiri' : 'Makan di Tempat'}
                  </strong></span>
                </div>
                {selectedTx.notes && (
                  <div className="text-[11px] text-slate-500 border-t border-slate-900 pt-1.5 mt-0.5 italic">
                    Catatan: &ldquo;{selectedTx.notes}&rdquo;
                  </div>
                )}
              </div>

              {selectedTx.fulfillmentType === 'delivery' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs flex flex-col gap-1.5 animate-fade-in">
                  <div className="text-[10px] font-mono text-emerald-450 font-bold uppercase tracking-wider border-b border-slate-900 pb-1 mb-0.5">
                    Detail Pengiriman
                  </div>
                  <div className="text-slate-400">
                    Penerima: <strong className="text-slate-200">{selectedTx.recipientName || '-'}</strong>
                  </div>
                  <div className="text-slate-400">
                    WhatsApp: <strong className="text-slate-200">{selectedTx.deliveryPhone || '-'}</strong>
                  </div>
                  <div className="text-slate-400 flex flex-col">
                    <span>Alamat:</span>
                    <span className="text-slate-200 bg-slate-900 p-2 rounded border border-slate-850 mt-1 leading-normal font-sans text-[11px]">
                      {selectedTx.deliveryAddress || '-'}
                    </span>
                  </div>
                  {selectedTx.deliveryNotes && (
                    <div className="text-slate-455 italic mt-0.5">
                      Catatan: &ldquo;{selectedTx.deliveryNotes}&rdquo;
                    </div>
                  )}
                  {selectedTx.deliveryDistanceKm !== undefined && selectedTx.deliveryDistanceKm > 0 && (
                    <div className="text-slate-400">
                      Jarak: <strong className="text-slate-200">{selectedTx.deliveryDistanceKm} KM</strong>
                    </div>
                  )}
                  {selectedTx.deliveryFeeCalculationType && (
                    <div className="text-slate-400">
                      Tipe Tarif: <strong className="text-slate-200">
                        {selectedTx.deliveryFeeCalculationType === 'distance_based' ? 'Berdasarkan Jarak' : 'Flat'}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div>
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Item Pembelian</h4>
                <div className="flex flex-col gap-3">
                  {selectedTx.items.map((item) => (
                    <div key={item.productId} className="flex justify-between items-center text-xs text-slate-350">
                      <div>
                        <p className="font-semibold text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{item.quantity} x {formatRupiah(item.price)}</p>
                      </div>
                      <span className="font-bold text-slate-300">{formatRupiah(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receipt Total */}
              <div className="border-t border-slate-850 pt-4 bg-slate-950/20 p-3 rounded-xl flex flex-col gap-1.5">
                {(selectedTx.subtotal !== undefined && 
                  (selectedTx.subtotal !== selectedTx.totalAmount || selectedTx.fulfillmentType === 'delivery')) && (
                  <>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal:</span>
                      <span className="text-slate-300">{formatRupiah(selectedTx.subtotal)}</span>
                    </div>
                    {selectedTx.serviceChargeAmount !== undefined && selectedTx.serviceChargeAmount > 0 && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Biaya Layanan:</span>
                        <span className="text-slate-300">{formatRupiah(selectedTx.serviceChargeAmount)}</span>
                      </div>
                    )}
                    {selectedTx.taxAmount !== undefined && selectedTx.taxAmount > 0 && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Pajak:</span>
                        <span className="text-slate-300">{formatRupiah(selectedTx.taxAmount)}</span>
                      </div>
                    )}
                    {selectedTx.fulfillmentType === 'delivery' && (
                      <>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Ongkos Kirim:</span>
                          {selectedTx.freeDeliveryApplied ? (
                            <span className="text-emerald-450 font-bold">Gratis Ongkir</span>
                          ) : (
                            <span className="text-slate-300">{formatRupiah(selectedTx.deliveryFeeAmount ?? 0)}</span>
                          )}
                        </div>
                        {selectedTx.deliveryAdminFeeAmount !== undefined && selectedTx.deliveryAdminFeeAmount > 0 && (
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Biaya Admin Delivery:</span>
                            <span className="text-slate-300">{formatRupiah(selectedTx.deliveryAdminFeeAmount)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                <div className="flex justify-between font-bold text-sm text-white border-t border-slate-800 pt-1.5 mt-0.5">
                  <span>Total Diterima:</span>
                  <span className="text-emerald-400 text-base">{formatRupiah(selectedTx.totalAmount)}</span>
                </div>
              </div>

              {/* Receipt actions link for admin */}
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`/receipt/${selectedTx.id}`, '_blank')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Lihat Struk Digital</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-slate-700" />
              <p>Pilih transaksi dari daftar di sebelah kiri untuk melihat rincian.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
