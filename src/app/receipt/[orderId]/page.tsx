'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Phone, AlertTriangle } from 'lucide-react';
import { orderService } from '../../../services/orderService';
import { businessService } from '../../../services/businessService';
import { Order, BusinessProfile } from '../../../types';
import { formatRupiah, formatDate } from '../../../utils/format';

export default function ReceiptPage() {
  const { orderId } = useParams() as { orderId: string };
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!orderId) return;
      try {
        const foundOrder = await orderService.getOrderById(orderId);
        if (foundOrder) {
          setOrder(foundOrder);
        }
        const profile = businessService.getProfile();
        setBusinessProfile(profile);
      } catch (err) {
        console.error('Error loading receipt data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [orderId]);

  // Handle auto-printing on load if ?print=true is present
  useEffect(() => {
    if (order && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('print') === 'true') {
        const timer = setTimeout(() => {
          window.print();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [order]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const getWhatsAppUrl = () => {
    if (!businessProfile?.whatsappNumber || !order) return '';
    const cleanNumber = businessProfile.whatsappNumber.replace(/\D/g, '');
    const message = `Halo *${businessProfile.businessName}*, saya ingin mengonfirmasi pesanan saya:\n\n` +
      `*Nomor Antrean:* ${order.queueNumber}\n` +
      `*Nama:* ${order.customerName}\n` +
      `*ID Pesanan:* ${order.id.slice(6, 14).toUpperCase()}\n` +
      `*Metode Pembayaran:* ${order.paymentMethod}\n` +
      `*Total Tagihan:* ${formatRupiah(order.totalAmount)}\n\n` +
      `Terima kasih!`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-mono animate-pulse">Memuat struk digital...</p>
        </div>
      </div>
    );
  }

  if (!order || !businessProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-lg font-bold text-white mb-2">Struk Tidak Ditemukan</h2>
          <p className="text-slate-400 text-xs mb-6">
            ID Pesanan tidak valid atau transaksi tidak tersedia dalam database lokal.
          </p>
          <button
            onClick={() => router.push('/order')}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Order</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start p-4 sm:p-8 relative">
      
      {/* Print CSS Injection */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-receipt-paper {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .text-slate-400, .text-slate-500 {
            color: #4b5563 !important;
          }
          .text-white {
            color: black !important;
          }
          .border-slate-800, .border-slate-850, .border-slate-900 {
            border-color: #d1d5db !important;
          }
          .bg-slate-950\/50, .bg-slate-950 {
            background: transparent !important;
          }
        }
      `}</style>

      {/* Screen action header */}
      <div className="w-full max-w-sm no-print flex justify-between items-center mb-6">
        <button
          onClick={() => router.push(`/order/success/${order.id}`)}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>
        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
          Struk Pembelian
        </span>
      </div>

      {/* Thermal Receipt Body */}
      <div className="print-receipt-paper w-full max-w-sm bg-white text-slate-950 border border-slate-200 rounded-2xl shadow-2xl p-6 font-mono text-[11px] leading-relaxed flex flex-col gap-4">
        
        {/* Header UMKM Brand */}
        <div className="text-center flex flex-col gap-1 border-b border-dashed border-slate-300 pb-4">
          <h2 className="text-sm font-black uppercase tracking-tight text-black">{businessProfile.businessName}</h2>
          <p className="text-[10px] text-slate-600 font-sans">{businessProfile.businessType}</p>
          {businessProfile.address && (
            <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{businessProfile.address}</p>
          )}
          {businessProfile.whatsappNumber && (
            <p className="text-[9px] text-slate-500">Telp/WA: {businessProfile.whatsappNumber}</p>
          )}
        </div>

        {/* Transaction details block */}
        <div className="flex flex-col gap-1 text-[10px] border-b border-dashed border-slate-300 pb-3">
          <div className="flex justify-between">
            <span>NO. ANTRIAN:</span>
            <span className="font-bold text-black text-xs">{order.queueNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>ID PESANAN:</span>
            <span className="font-bold text-black">{order.id.slice(6, 14).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>TANGGAL:</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>NAMA:</span>
            <span className="uppercase text-black font-semibold">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span>STATUS:</span>
            <span className="font-bold">{order.paymentStatus === 'Paid' ? 'LUNAS' : 'BELUM BAYAR'}</span>
          </div>
        </div>

        {/* Itemized table */}
        <div className="flex flex-col gap-2 py-1">
          <div className="flex justify-between font-bold text-black border-b border-slate-300 pb-1.5">
            <span>MENU</span>
            <span>QTY</span>
            <span className="text-right">TOTAL</span>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {order.items.map((item) => (
              <div key={item.productId} className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-black">{item.name}</p>
                  <p className="text-[9px] text-slate-500">{formatRupiah(item.price)}</p>
                </div>
                <span className="w-8 text-center">{item.quantity}x</span>
                <span className="font-bold text-black text-right min-w-[70px]">
                  {formatRupiah(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing breakdown calculations */}
        <div className="border-t border-dashed border-slate-300 pt-3 flex flex-col gap-1.5 text-[10px]">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatRupiah(order.subtotal ?? order.totalAmount)}</span>
          </div>

          {order.serviceChargeAmount !== undefined && order.serviceChargeAmount > 0 && (
            <div className="flex justify-between">
              <span>B. LAYANAN ({businessProfile.serviceChargePercentage}%):</span>
              <span>{formatRupiah(order.serviceChargeAmount)}</span>
            </div>
          )}

          {order.taxAmount !== undefined && order.taxAmount > 0 && (
            <div className="flex justify-between">
              <span>PAJAK (PPN {businessProfile.taxPercentage}%):</span>
              <span>{formatRupiah(order.taxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs font-black text-black border-t border-dashed border-slate-300 pt-2.5 mt-1">
            <span>TOTAL BAYAR:</span>
            <span>{formatRupiah(order.totalAmount)}</span>
          </div>
        </div>

        {/* Customer notes if any */}
        {order.notes && (
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] italic text-slate-600 leading-normal">
            Catatan: &ldquo;{order.notes}&rdquo;
          </div>
        )}

        {/* Footer greeting */}
        <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-500 leading-tight">
          <p className="font-semibold text-slate-700">Terima kasih atas pesanan Anda!</p>
          <p className="mt-1">UMKM Pilot - Powered by Antigravity</p>
        </div>
      </div>

      {/* Screen action footer (hidden during print) */}
      <div className="w-full max-w-sm no-print flex flex-col gap-2 mt-6">
        <button
          onClick={handlePrint}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Struk (Browser)</span>
        </button>

        {businessProfile.whatsappNumber && (
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Hubungi Toko (WhatsApp)</span>
          </a>
        )}
      </div>

    </div>
  );
}
