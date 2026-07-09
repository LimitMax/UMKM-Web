'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Check, 
  ArrowLeft, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  AlertCircle,
  FileText,
  Home,
  ShoppingBag
} from 'lucide-react';
import { orderService } from '@/services/orderService';
import { businessService } from '@/services/businessService';
import { Order, BusinessProfile } from '@/types';
import { formatRupiah, formatDate, formatOrderStatus, formatPaymentStatus } from '@/utils/format';
import { getEtaLabel, formatEstimatedTime, formatEtaDisplay } from '@/utils/etaHelpers';



export default function OrderSuccessPage() {
  const { orderId } = useParams() as { orderId: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businessProfile] = useState<BusinessProfile | null>(() => {
    return businessService.getProfile();
  });
  const [whatsappNumber] = useState<string>(() => {
    return businessService.getProfile()?.whatsappNumber || '';
  });

  // Poll localStorage to get live cashier status updates
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const found = await orderService.getOrderById(orderId);
      if (found) {
        setOrder(found);
      }
      setIsLoading(false);
    };

    fetchOrder();
    
    // Poll every 3 seconds
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-mono animate-pulse">Memuat detail pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="glass p-8 rounded-2xl max-w-md w-full text-center border border-slate-800">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">Pesanan Tidak Ditemukan</h2>
          <p className="text-slate-400 text-xs mb-6">
            ID Pesanan tidak valid atau data telah terhapus.
          </p>
          <Link 
            href="/order" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </Link>
        </div>
      </div>
    );
  }

  const getTimelineSteps = () => {
    if (order?.fulfillmentType === 'delivery') {
      return [
        { key: 'Waiting for Payment', label: 'Menunggu Pembayaran' },
        { key: 'Paid', label: 'Sudah Dibayar' },
        { key: 'Processing', label: 'Sedang Diproses' },
        { key: 'Ready', label: 'Siap Dikirim' },
        { key: 'delivering', label: 'Sedang Dikirim' },
        { key: 'Completed', label: 'Selesai' }
      ];
    } else if (order?.fulfillmentType === 'pickup') {
      return [
        { key: 'Waiting for Payment', label: 'Menunggu Pembayaran' },
        { key: 'Paid', label: 'Sudah Dibayar' },
        { key: 'Processing', label: 'Sedang Diproses' },
        { key: 'Ready', label: 'Siap Diambil' },
        { key: 'Completed', label: 'Selesai' }
      ];
    } else {
      return [
        { key: 'Waiting for Payment', label: 'Menunggu Pembayaran' },
        { key: 'Paid', label: 'Sudah Dibayar' },
        { key: 'Processing', label: 'Sedang Diproses' },
        { key: 'Ready', label: 'Siap Disajikan' },
        { key: 'Completed', label: 'Selesai' }
      ];
    }
  };

  const timelineSteps = getTimelineSteps();
  let activeStepIndex = timelineSteps.findIndex((step) => step.key === order.status);
  
  // If payment status is Paid and status is still "Waiting for Payment", boost index to Paid
  if (order.status === 'Waiting for Payment' && order.paymentStatus === 'Paid') {
    activeStepIndex = 1; // Already paid
  }

  const isCancelled = order.status === 'Cancelled';

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 flex justify-center items-center">
      <div className="max-w-xl w-full flex flex-col gap-6">
        
        {/* Navigation links */}
        <div className="flex justify-between items-center px-2">
          <Link href="/order" className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all">
            <ArrowLeft className="w-4 h-4" />
            <span>Pesan Lagi</span>
          </Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all">
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
        </div>

        {/* Card: Success Message & Queue */}
        <div className="glass rounded-3xl p-6 text-center border border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />
          
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-500/5">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <h1 className="text-2xl font-black text-white mb-1">Pesanan Berhasil Dikirim!</h1>
          <p className="text-xs text-slate-400">Silakan tunjukkan struk digital ini ke kasir jika diperlukan.</p>

          <div className="my-6 py-4 bg-slate-950/60 rounded-2xl border border-slate-900 flex flex-col items-center">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Nomor Antrean</span>
            <span className="text-5xl font-black text-emerald-400 tracking-tight my-1">{order.queueNumber}</span>
            <span className="text-[10px] text-slate-400 px-3 py-1 rounded bg-slate-900 border border-slate-800/50 mt-1">
              ID: {order.id.slice(6, 14).toUpperCase()}
            </span>
          </div>

          {/* Alert for Next Step Guide */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs flex flex-col gap-2.5 mt-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-850 pb-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Instruksi Langkah Berikutnya</span>
            </div>
            
            <div className="text-slate-350 leading-relaxed font-sans">
              {order.status === 'Waiting for Payment' && (
                order.paymentMethod === 'Cash' 
                  ? '💡 Lakukan pembayaran tunai ke kasir dengan menunjukkan nomor antrean ini.' 
                  : order.paymentMethod === 'QRIS'
                    ? `💡 Silakan bayar tagihan sebesar ${formatRupiah(order.totalAmount)} dengan memindai kode QRIS toko di meja kasir.`
                    : `💡 Silakan transfer sebesar ${formatRupiah(order.totalAmount)} ke rekening bank toko dan tunjukkan tanda buktinya ke kasir.`
              )}
              {(order.status === 'Paid' || order.status === 'Processing') && (
                order.fulfillmentType === 'delivery'
                  ? '💡 Pesanan Anda telah divalidasi dan sedang diproses. Mohon menunggu kurir toko menghubungi Anda.'
                  : '💡 Pesanan Anda telah divalidasi dan sedang dipersiapkan di dapur. Mohon menunggu nomor antrean Anda dipanggil.'
              )}
              {order.status === 'Ready' && (
                order.fulfillmentType === 'delivery'
                  ? '🎉 Pesanan Anda sudah siap dikirim! Kurir kami sedang dalam perjalanan mengantarkan pesanan ke alamat Anda.'
                  : order.fulfillmentType === 'pickup'
                    ? '🎉 Pesanan Anda sudah siap diambil! Silakan ambil di konter pelayanan dengan menunjukkan nomor antrean ini.'
                    : '🎉 Pesanan Anda sudah siap disajikan! Staff kami akan segera menyajikan hidangan ke meja Anda.'
              )}
              {order.status === 'delivering' && (
                '🚚 Pesanan Anda sedang dalam perjalanan oleh kurir kami ke alamat Anda. Mohon bersiap menerima kiriman.'
              )}
              {order.status === 'Completed' && (
                order.fulfillmentType === 'delivery'
                  ? '✅ Pesanan telah sukses diantarkan dan diterima. Terima kasih atas pesanan Anda!'
                  : '✅ Pesanan telah selesai diambil. Terima kasih atas pesanan Anda, selamat menikmati!'
              )}
              {isCancelled && (
                '❌ Pesanan ini telah dibatalkan. Silakan lakukan pemesanan ulang atau hubungi admin.'
              )}
            </div>

            {order.fulfillmentType === 'delivery' && businessProfile?.deliverySettings?.deliveryInstruction && (
              <div className="mt-2 text-amber-400 font-sans text-[10px] border-t border-slate-850 pt-2 leading-relaxed">
                💡 <strong>Catatan Toko:</strong> {businessProfile.deliverySettings.deliveryInstruction}
              </div>
            )}
          </div>
        </div>

        {/* ETA Card — Phase 6.8 */}
        {!isCancelled && businessProfile?.etaSettings?.etaEnabled && order.estimatedTotalMinutes !== undefined && (
          <div className="glass rounded-3xl p-5 border border-amber-500/20 bg-amber-500/4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{getEtaLabel(order.fulfillmentType)}</span>
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Estimasi Total</span>
                <span className="text-sm font-black text-amber-400">
                  {formatEtaDisplay(
                    order.estimatedTotalMinutes,
                    order.fulfillmentType === 'delivery' ? order.estimatedArrivalAt : order.estimatedReadyAt,
                    businessProfile.etaSettings!.etaDisplayMode
                  )}
                </span>
              </div>
              {order.estimatedReadyAt && order.fulfillmentType !== 'delivery' && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Perkiraan Siap</span>
                  <span className="text-xs font-bold text-white">{formatEstimatedTime(order.estimatedReadyAt)}</span>
                </div>
              )}
              {order.estimatedArrivalAt && order.fulfillmentType === 'delivery' && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Perkiraan Sampai</span>
                  <span className="text-xs font-bold text-white">{formatEstimatedTime(order.estimatedArrivalAt)}</span>
                </div>
              )}
              {order.etaManuallyAdjusted && order.etaAdjustmentReason && (
                <div className="flex items-start gap-1.5 mt-1 pt-2 border-t border-amber-500/15">
                  <span className="text-[10px] text-amber-400/60">Disesuaikan kasir:</span>
                  <span className="text-[10px] text-amber-300/80 italic">{order.etaAdjustmentReason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card: Real-time Status Timeline (Only show if not cancelled) */}
        {!isCancelled && (
          <div className="glass rounded-3xl p-6 border border-slate-800/80">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-emerald-400" />
              <span>Status Pesanan Real-time</span>
            </h3>

            {/* Vertical/Horizontal Timeline */}
            <div className="relative pl-6 border-l border-slate-800 space-y-6">
              {timelineSteps.map((step, idx) => {
                const isPassed = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;

                return (
                  <div key={step.key} className="relative">
                    {/* Timeline dot */}
                    <span 
                      className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isPassed 
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                          : isCurrent
                            ? 'bg-slate-900 border-emerald-400 ring-4 ring-emerald-400/25'
                            : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {isPassed && <Check className="w-2.5 h-2.5 stroke-[3] text-slate-950" />}
                      {isCurrent && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />}
                    </span>

                    <div className="flex flex-col">
                      <span className={`text-xs font-bold transition-colors ${
                        isPassed ? 'text-emerald-400/80' : isCurrent ? 'text-emerald-400 text-sm' : 'text-slate-500'
                      }`}>
                        {step.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-slate-400 mt-1 font-sans">
                          {step.key === 'Waiting for Payment' && 'Menunggu pembayaran diselesaikan...'}
                          {step.key === 'Paid' && 'Pembayaran divalidasi. Menunggu antrean dapur...'}
                          {step.key === 'Processing' && 'Koki/Staff sedang mempersiapkan pesanan Anda...'}
                          {step.key === 'Ready' && (
                            order.fulfillmentType === 'delivery'
                              ? 'Pesanan siap dikirim.'
                              : order.fulfillmentType === 'pickup'
                                ? 'Pesanan siap diambil.'
                                : 'Pesanan akan disajikan.'
                          )}
                          {step.key === 'delivering' && 'Kurir sedang mengantarkan pesanan ke alamat Anda...'}
                          {step.key === 'Completed' && 'Pesanan telah selesai diproses. Terima kasih!'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card: Order Receipt Details */}
        <div className="glass rounded-3xl p-6 border border-slate-800/80">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800/50 pb-3">
            <FileText className="w-4.5 h-4.5 text-emerald-400" />
            <span>Rincian Struk Pembelian</span>
          </h3>

          {/* Customer Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-4 p-3 bg-slate-950/40 rounded-xl border border-slate-900">
            <div className="flex items-center gap-1.5 text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Nama: <strong className="text-slate-200">{order.customerName}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>WhatsApp: <strong className="text-slate-200">{order.customerPhone}</strong></span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Pembayaran: <strong className="text-slate-200">{order.paymentMethod} ({formatPaymentStatus(order.paymentStatus)})</strong></span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 text-slate-400 border-t border-slate-900 pt-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Status Pesanan: <strong className="text-slate-200">{formatOrderStatus(order.status)}</strong></span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 text-slate-400 border-t border-slate-900 pt-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
              <span>Tipe Pelayanan: <strong className="text-slate-200">
                {order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'pickup' ? 'Ambil Sendiri' : 'Makan di Tempat'}
              </strong></span>
            </div>
            {order.notes && (
              <div className="col-span-2 text-[11px] text-amber-400/80 italic mt-0.5 pt-1.5 border-t border-slate-900">
                Catatan: &ldquo;{order.notes}&rdquo;
              </div>
            )}
            {order.fulfillmentType === 'delivery' && (
              <div className="col-span-2 flex flex-col gap-1.5 border-t border-slate-900 pt-2.5 mt-1 text-[11px]">
                <span className="font-mono text-emerald-450 font-bold uppercase tracking-wider text-[9px]">Detail Pengiriman:</span>
                <div className="text-slate-400">
                  Penerima: <strong className="text-slate-200">{order.recipientName || '-'}</strong>
                </div>
                <div className="text-slate-400">
                  No. WhatsApp Penerima: <strong className="text-slate-200">{order.deliveryPhone || '-'}</strong>
                </div>
                <div className="text-slate-400 flex flex-col">
                  <span>Alamat Lengkap:</span>
                  <span className="text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-905 mt-1 leading-normal font-sans text-xs">
                    {order.deliveryAddress || '-'}
                  </span>
                </div>
                {order.deliveryNotes && (
                  <div className="text-slate-450 italic mt-0.5">
                    Catatan Pengiriman: &ldquo;{order.deliveryNotes}&rdquo;
                  </div>
                )}
                {order.deliveryDistanceKm !== undefined && order.deliveryDistanceKm > 0 && (
                  <div className="text-slate-400 mt-0.5">
                    Jarak Pengiriman: <strong className="text-slate-200">{order.deliveryDistanceKm} KM</strong>
                  </div>
                )}
                {order.deliveryFeeCalculationType && (
                  <div className="text-slate-400">
                    Tipe Ongkir: <strong className="text-slate-200">
                      {order.deliveryFeeCalculationType === 'distance_based' ? 'Berdasarkan Jarak' : 'Tarif Flat'}
                    </strong>
                  </div>
                )}
                <div className="text-slate-400 flex items-center gap-1.5">
                  <span>Ongkos Kirim:</span>
                  {order.freeDeliveryApplied ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">Gratis Ongkir</span>
                  ) : (
                    <strong className="text-slate-200">{formatRupiah(order.deliveryFeeAmount ?? 0)}</strong>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ordered items list */}
          <div className="flex flex-col gap-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{item.name}</p>
                  <p className="text-[10px] text-slate-500">{item.quantity} x {formatRupiah(item.price)}</p>
                </div>
                <span className="font-bold text-slate-300">
                  {formatRupiah(item.price * item.quantity)}
                </span>
              </div>
            ))}

            {/* Breakdown Rows */}
            {(order.subtotal !== undefined && (order.subtotal !== order.totalAmount || order.fulfillmentType === 'delivery')) && (
              <div className="border-t border-slate-900 pt-3 mt-2 flex flex-col gap-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-350">{formatRupiah(order.subtotal)}</span>
                </div>
                {order.serviceChargeAmount !== undefined && order.serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Biaya Layanan</span>
                    <span className="text-slate-350">{formatRupiah(order.serviceChargeAmount)}</span>
                  </div>
                )}
                {order.taxAmount !== undefined && order.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Pajak</span>
                    <span className="text-slate-350">{formatRupiah(order.taxAmount)}</span>
                  </div>
                )}
                {order.fulfillmentType === 'delivery' && (
                  <>
                    <div className="flex justify-between">
                      <span>Ongkos Kirim</span>
                      {order.freeDeliveryApplied ? (
                        <span className="text-emerald-450 font-bold">Gratis Ongkir</span>
                      ) : (
                        <span className="text-slate-350">{formatRupiah(order.deliveryFeeAmount ?? 0)}</span>
                      )}
                    </div>
                    {order.deliveryAdminFeeAmount !== undefined && order.deliveryAdminFeeAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Biaya Admin Delivery</span>
                        <span className="text-slate-350">{formatRupiah(order.deliveryAdminFeeAmount)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Total Row */}
            <div className="border-t border-slate-800 pt-3 mt-2 flex justify-between items-center font-bold text-sm text-white">
              <span>Total Keseluruhan</span>
              <span className="text-emerald-400 text-base">{formatRupiah(order.totalAmount)}</span>
            </div>
          </div>
          
          <div className="text-center text-[10px] text-slate-500 mt-6 pt-3 border-t border-slate-900 font-mono">
            {formatDate(order.createdAt)}
          </div>
        </div>

        {/* Actions Grid */}
        <div className="flex flex-col gap-3">
          <div className="glass rounded-3xl p-5 border border-slate-800/80 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/receipt/${order.id}`}
              className="flex-1 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Lihat Struk Digital</span>
            </Link>

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Halo, saya ingin menanyakan tentang pesanan saya dengan nomor antrean *${order.queueNumber}* (ID: ${order.id.substring(0, 8).toUpperCase()}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-center"
              >
                <Phone className="w-4 h-4" />
                <span>Hubungi WhatsApp Toko</span>
              </a>
            )}
          </div>

          <Link
            href="/order"
            className="w-full py-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Menu</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
