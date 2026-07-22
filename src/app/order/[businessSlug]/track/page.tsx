'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Clock, 
  CreditCard, 
  AlertCircle,
  FileText,
  Home,
  RefreshCw,
  Search,
  Check,
  Loader2
} from 'lucide-react';
import { formatRupiah, formatDate } from '@/utils/format';
import { getEtaLabel, formatEtaDisplay } from '@/utils/etaHelpers';
import { FulfillmentType } from '@/types';

interface OrderItemInfo {
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface LatestPaymentInfo {
  status: string;
  amount: number;
  paymentType?: string | null;
  snapToken?: string | null;
  redirectUrl?: string | null;
  provider: string;
}

interface TrackedOrder {
  trackingCode: string;
  queueNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentType: FulfillmentType;
  totalAmount: number;
  createdAt: string;
  customerName: string;
  maskedPhone: string;
  recipientName: string | null;
  maskedDeliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  deliveryDistanceKm: number | null;
  deliveryFeeAmount: number | null;
  deliveryAdminFeeAmount: number | null;
  freeDeliveryApplied: boolean | null;
  notes: string | null;
  estimatedPreparationMinutes?: number;
  estimatedDeliveryMinutes?: number;
  estimatedTotalMinutes?: number;
  estimatedReadyAt?: string;
  estimatedArrivalAt?: string;
  etaLabel?: string;
  etaUpdatedAt?: string;
  etaManuallyAdjusted?: boolean;
  items: OrderItemInfo[];
  latestPayment: LatestPaymentInfo | null;
}

interface BusinessInfo {
  name: string;
  logoUrl: string | null;
  midtransClientKey?: string | null;
}

type SnapCallbacks = {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapCallbacks) => void;
    };
  }
}

export default function OrderTrackingPage() {
  const { businessSlug } = useParams() as { businessSlug: string };
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  // Page UI States
  const [trackingCode, setTrackingCode] = useState(codeParam);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  
  // Loading & Error States
  const [isBizLoading, setIsBizLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [paymentOpenLoading, setPaymentOpenLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showPaymentSuccessAlert, setShowPaymentSuccessAlert] = useState<boolean>(false);

  // Polling & In-flight Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const prevPaymentStatusRef = useRef<string | null>(null);

  // Order status Indonesian translation mapper
  const formatTrackingOrderStatus = (status: string, fulfillmentType?: string): string => {
    switch (status) {
      case 'pending': return 'Menunggu Pembayaran';
      case 'paid': return 'Sudah Dibayar';
      case 'processing': return 'Sedang Diproses';
      case 'ready': 
        return fulfillmentType === 'delivery' ? 'Siap Dikirim' : 'Siap Diambil';
      case 'delivering': return 'Sedang Dikirim';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  // Payment status Indonesian translation mapper
  const formatTrackingPaymentStatus = (status: string): string => {
    switch (status) {
      case 'pending': return 'Menunggu Pembayaran';
      case 'paid': return 'Sudah Dibayar';
      case 'failed': return 'Pembayaran Gagal';
      case 'expired': return 'Pembayaran Kedaluwarsa';
      case 'cancelled': return 'Dibatalkan';
      case 'refunded': return 'Dikembalikan';
      default: return status;
    }
  };

  // Fetch business metadata on load
  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const res = await fetch(`/api/public/businesses/${encodeURIComponent(businessSlug)}`);
        if (!res.ok) {
          setErrorMsg('Toko tidak ditemukan atau tidak melayani pemesanan publik.');
          return;
        }
        const data = await res.json();
        if (data?.business) {
          setBusiness({
            name: data.business.name,
            logoUrl: data.business.logo_url || null,
            midtransClientKey: data.business.midtrans_client_key || null
          });
        }
      } catch (err) {
        console.error('Failed to load business profile:', err);
        setErrorMsg('Gagal memuat profil toko.');
      } finally {
        setIsBizLoading(false);
      }
    };

    if (businessSlug) {
      fetchBusiness();
    }
  }, [businessSlug]);

  // Main status query function
  const fetchTrackingStatus = useCallback(async (codeToTrack: string, showSpinner = false) => {
    if (!codeToTrack.trim()) return;
    
    // Prevent duplicate in-flight requests during auto-polling
    if (inFlightRef.current && !showSpinner) return;

    inFlightRef.current = true;
    if (showSpinner) setIsSearchLoading(true);
    setErrorMsg(null);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/public/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          trackingCode: codeToTrack
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setErrorMsg(data.message || 'Pesanan tidak ditemukan. Pastikan kode cek sudah benar.');
        return;
      }

      const newOrder: TrackedOrder = data.order;

      // Detect transition from pending -> paid
      if (prevPaymentStatusRef.current === 'pending' && newOrder.paymentStatus === 'paid') {
        setShowPaymentSuccessAlert(true);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
      prevPaymentStatusRef.current = newOrder.paymentStatus;

      setOrder(newOrder);
      if (data.business) {
        setBusiness({
          name: data.business.name,
          logoUrl: data.business.logoUrl || null,
          midtransClientKey: data.business.midtransClientKey || null
        });
      }
      // Clean up URL to include tracked code without reloading
      const newUrl = `/order/${businessSlug}/track?code=${encodeURIComponent(codeToTrack)}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    } catch (err) {
      console.error('Track API error:', err);
      setErrorMsg('Gagal terhubung ke server untuk mengecek status.');
    } finally {
      inFlightRef.current = false;
      if (showSpinner) setIsSearchLoading(false);
    }
  }, [businessSlug]);

  // Handle tracking submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;
    setShowPaymentSuccessAlert(false);
    prevPaymentStatusRef.current = null;
    fetchTrackingStatus(trackingCode, true);
  };

  // Pre-fill tracking trigger from URL param on load
  useEffect(() => {
    if (codeParam && businessSlug) {
      const timer = setTimeout(() => {
        fetchTrackingStatus(codeParam, true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [codeParam, businessSlug, fetchTrackingStatus]);

  // Set up status auto-polling (every 3 seconds for pending payment)
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Stop polling if order is absent, payment is settled ('paid'), or order reached terminal state
    if (!order || order.paymentStatus === 'paid' || ['completed', 'cancelled'].includes(order.orderStatus)) {
      return;
    }

    // While payment_status is "pending", poll every 3 seconds
    const pollMs = order.paymentStatus === 'pending' || order.orderStatus === 'pending' ? 3000 : 10000;
    const currentCode = order.trackingCode;

    pollingIntervalRef.current = setInterval(() => {
      fetchTrackingStatus(currentCode, false);
    }, pollMs);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [order, fetchTrackingStatus]);

  // Dynamic Midtrans Snap Script Loader
  const loadMidtransSnapScript = (customClientKey?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Snap hanya tersedia di browser.'));
        return;
      }

      const targetKey = customClientKey || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      if (!targetKey) {
        reject(new Error('Client key Midtrans belum dikonfigurasi.'));
        return;
      }

      // If a different script is already loaded (different merchant key), remove and reload
      const existingScript = document.getElementById('midtrans-snap-script') as HTMLScriptElement | null;
      if (existingScript && existingScript.getAttribute('data-client-key') !== targetKey) {
        existingScript.remove();
        delete window.snap;
      }

      if (window.snap) {
        resolve();
        return;
      }

      const staleScript = document.getElementById('midtrans-snap-script') as HTMLScriptElement | null;
      if (staleScript) {
        staleScript.addEventListener('load', () => resolve(), { once: true });
        staleScript.addEventListener('error', () => reject(new Error('Gagal memuat Snap Midtrans.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'midtrans-snap-script';
      script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
      script.async = true;
      script.setAttribute('data-client-key', targetKey);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Gagal memuat Snap Midtrans.'));
      document.body.appendChild(script);
    });
  };

  // Continue Payment handler
  const handleContinuePayment = async () => {
    if (paymentOpenLoading || syncLoading) return;
    if (!order?.latestPayment) {
      setSyncMessage('Metadata pembayaran belum tersedia.');
      return;
    }

    setPaymentOpenLoading(true);
    setSyncMessage(null);

    const { snapToken, redirectUrl } = order.latestPayment;

    try {
      if (snapToken) {
        await loadMidtransSnapScript(business?.midtransClientKey || undefined);
        if (!window.snap) throw new Error('Snap token tidak dapat dimuat.');
        window.snap.pay(snapToken, {
          onSuccess: () => {
            fetchTrackingStatus(order.trackingCode, true);
          },
          onPending: () => {
            fetchTrackingStatus(order.trackingCode, true);
          },
          onClose: () => setPaymentOpenLoading(false),
          onError: () => {
            if (redirectUrl) {
              window.location.assign(redirectUrl);
              return;
            }
            setSyncMessage('Gagal membuka halaman pembayaran.');
            setPaymentOpenLoading(false);
          },
        });
        return;
      }

      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }

      setSyncMessage('Token pembayaran tidak ditemukan.');
    } catch (err) {
      console.error('Snap open error:', err);
      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }
      setSyncMessage('Gagal memuat sistem pembayaran online.');
    } finally {
      setPaymentOpenLoading(false);
    }
  };

  // Sync Payment handler
  const handleSyncPaymentStatus = async () => {
    if (!order || syncLoading || paymentOpenLoading) return;
    setSyncLoading(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/payments/midtrans/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackingCode: order.trackingCode,
          businessSlug
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Gagal cek status pembayaran.');
      }

      await fetchTrackingStatus(order.trackingCode, false);
      setSyncMessage('Status pembayaran berhasil diperbarui.');
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Gagal sinkronisasi status pembayaran.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Timeline computation
  const getTimelineSteps = (fulfillmentType: string) => {
    const baseSteps = [
      { key: 'created', label: 'Pesanan Dibuat' },
      { key: 'pending', label: 'Menunggu Pembayaran' },
      { key: 'paid', label: 'Sudah Dibayar' },
      { key: 'processing', label: 'Sedang Diproses' },
      { key: 'ready', label: fulfillmentType === 'delivery' ? 'Siap Dikirim' : 'Siap Diambil' }
    ];

    if (fulfillmentType === 'delivery') {
      baseSteps.push({ key: 'delivering', label: 'Sedang Dikirim' });
    }

    baseSteps.push({ key: 'completed', label: 'Selesai' });
    return baseSteps;
  };

  const getActiveStepIndex = (steps: { key: string; label: string }[], orderStatus: string, paymentStatus: string) => {
    if (orderStatus === 'cancelled') return -1;
    
    let activeKey = orderStatus;
    
    // Override key for paid pending orders
    if (orderStatus === 'pending' && paymentStatus === 'paid') {
      activeKey = 'paid';
    } else if (orderStatus === 'paid') {
      activeKey = 'paid';
    }

    const index = steps.findIndex(s => s.key === activeKey);
    return index !== -1 ? index : 0; // Default to 'Pesanan Dibuat'
  };

  // Loading Screen
  if (isBizLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-mono animate-pulse">Memuat halaman pelacakan...</p>
        </div>
      </div>
    );
  }

  // Header navigation parameters
  const menuHref = `/order/${businessSlug}`;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 flex justify-center items-start">
      <div className="max-w-xl w-full flex flex-col gap-6">
        
        {/* Navigation links */}
        <div className="flex justify-between items-center px-2">
          <Link href={menuHref} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all">
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all">
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
        </div>

        {/* Brand Banner */}
        <div className="glass rounded-3xl p-5 border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <Image
            src={business?.logoUrl || 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=200&q=80'} 
            alt={business?.name || 'Toko UMKM'} 
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-850"
          />
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{business?.name || 'Toko UMKM'}</h1>
            <p className="text-[10px] text-emerald-400 font-mono">Pelacakan Pesanan Mandiri</p>
          </div>
        </div>

        {/* Search Input Form */}
        <div className="glass rounded-3xl p-6 border border-slate-800/80">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="trackingCodeInput" className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                Kode Cek Pesanan
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="trackingCodeInput"
                  type="text"
                  required
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Contoh: K8P2Q9"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all text-xs font-mono uppercase tracking-widest"
                />
              </div>
              <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                Masukkan kode cek yang tertera pada halaman sukses atau struk pesanan Anda.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSearchLoading || !trackingCode.trim()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-500 text-slate-950 font-black rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSearchLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengecek...</span>
                </>
              ) : (
                <span>Cek Status Pesanan</span>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Order Details Display Card */}
        {order && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* Success notification banner when payment transitions to paid */}
            {showPaymentSuccessAlert && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 flex items-start gap-3.5 animate-in fade-in slide-in-from-top duration-300">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl flex-shrink-0 mt-0.5">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-400">Pembayaran Berhasil Dikonfirmasi!</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Sistem telah mengonfirmasi pembayaran Midtrans Anda secara otomatis. Pesanan Anda kini sedang disiapkan oleh toko.
                  </p>
                </div>
              </div>
            )}

            {/* Header: Queue & Status Summary */}
            <div className="glass rounded-3xl p-6 text-center border border-slate-800/80 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
              
              <h2 className="text-xs font-mono tracking-widest text-slate-500 uppercase">Nomor Antrean Anda</h2>
              <span className="text-5xl font-black text-emerald-400 tracking-tight my-2 block">{order.queueNumber}</span>
              
              <div className="flex justify-center gap-2 mt-3">
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350 font-mono">
                  KODE: {order.trackingCode}
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold">
                  {formatTrackingOrderStatus(order.orderStatus, order.fulfillmentType)}
                </span>
              </div>

              {/* Autorefresh banner info */}
              {!['completed', 'cancelled'].includes(order.orderStatus) && order.paymentStatus !== 'paid' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800/50 text-[9px] text-slate-400 mt-4 select-none animate-pulse">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>{order.paymentStatus === 'pending' ? 'Mengecek pembayaran otomatis setiap 3 detik...' : 'Otomatis diperbarui'}</span>
                </div>
              )}
            </div>

            {/* Payment Summary */}
            <div className={`glass rounded-3xl p-5 border ${
              order.paymentStatus === 'paid'
                ? 'border-emerald-500/25 bg-emerald-500/5'
                : ['failed', 'expired', 'cancelled'].includes(order.paymentStatus)
                  ? 'border-rose-500/25 bg-rose-500/5'
                  : 'border-amber-500/25 bg-amber-500/5'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : ['failed', 'expired', 'cancelled'].includes(order.paymentStatus)
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTrackingPaymentStatus(order.paymentStatus)}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {order.paymentMethod === 'cash' ? 'Metode Pembayaran Tunai' : 'Metode Non-Tunai (Online)'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {order.paymentStatus === 'paid'
                        ? 'Pembayaran pesanan Anda telah tuntas diverifikasi sistem.'
                        : order.paymentMethod === 'cash'
                          ? 'Silakan selesaikan pembayaran langsung di kasir.'
                          : 'Selesaikan transaksi Anda melalui link merchant resmi di bawah.'}
                    </p>
                  </div>
                </div>
                <CreditCard className={`w-7 h-7 flex-shrink-0 ${
                  order.paymentStatus === 'paid' ? 'text-emerald-350' : 'text-amber-350'
                }`} />
              </div>

              {/* Online payment buttons */}
              {order.paymentMethod === 'non_cash' && order.paymentStatus === 'pending' && order.latestPayment && (
                <div className="flex flex-col gap-2 mt-4 border-t border-slate-800/60 pt-3.5">
                  <button
                    type="button"
                    disabled={paymentOpenLoading || syncLoading}
                    onClick={handleContinuePayment}
                    className="w-full py-2 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all"
                  >
                    {paymentOpenLoading ? 'Membuka Halaman Pembayaran...' : 'Lanjutkan Pembayaran'}
                  </button>
                  <button
                    type="button"
                    disabled={syncLoading || paymentOpenLoading}
                    onClick={handleSyncPaymentStatus}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
                  >
                    {syncLoading ? 'Sinkronisasi Status...' : 'Cek Status Pembayaran'}
                  </button>
                </div>
              )}
              {syncMessage && (
                <p className="mt-2 text-center text-[10px] text-slate-400 animate-pulse">{syncMessage}</p>
              )}
            </div>

            {/* ETA Details Badge if available and not cancelled */}
            {order.orderStatus !== 'cancelled' && order.estimatedTotalMinutes !== undefined && (
              <div className="glass rounded-3xl p-5 border border-amber-500/20 bg-amber-500/4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider">
                    {getEtaLabel(order.fulfillmentType)}
                  </span>
                  <span className="text-xs font-bold text-white leading-normal">
                    {formatEtaDisplay(
                      order.estimatedTotalMinutes,
                      order.fulfillmentType === 'delivery' ? order.estimatedArrivalAt : order.estimatedReadyAt,
                      'both' // Default display format
                    )}
                  </span>
                  {order.etaManuallyAdjusted && (
                    <span className="text-[8px] text-amber-300/80 italic mt-0.5">
                      ⚠️ Estimasi disesuaikan secara manual oleh kasir
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Realtime Status Timeline */}
            {order.orderStatus !== 'cancelled' && (
              <div className="glass rounded-3xl p-6 border border-slate-800/80">
                <h3 className="text-xs font-bold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-450" />
                  <span>Linimasa Status Pesanan</span>
                </h3>

                <div className="relative pl-5 border-l border-slate-850 space-y-6">
                  {(() => {
                    const steps = getTimelineSteps(order.fulfillmentType);
                    const activeIndex = getActiveStepIndex(steps, order.orderStatus, order.paymentStatus);

                    return steps.map((step, idx) => {
                      const isPassed = idx < activeIndex;
                      const isCurrent = idx === activeIndex;

                      return (
                        <div key={step.key} className="relative">
                          <span 
                            className={`absolute -left-[29px] top-1.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                              isPassed 
                                ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                                : isCurrent
                                  ? 'bg-slate-900 border-emerald-400 ring-4 ring-emerald-400/20'
                                  : 'bg-slate-950 border-slate-850'
                            }`}
                          >
                            {isPassed && <Check className="w-2 h-2 stroke-[3] text-slate-950" />}
                            {isCurrent && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />}
                          </span>

                          <div className="flex flex-col">
                            <span className={`text-xs font-bold transition-colors ${
                              isPassed ? 'text-emerald-400/80' : isCurrent ? 'text-emerald-450 text-sm' : 'text-slate-500'
                            }`}>
                              {step.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                                {step.key === 'created' && 'Pesanan baru masuk ke sistem.'}
                                {step.key === 'pending' && 'Menunggu penyelesaian pembayaran oleh pelanggan.'}
                                {step.key === 'paid' && 'Pembayaran tuntas. Pesanan menunggu persiapan staff.'}
                                {step.key === 'processing' && 'Dapur sedang mempersiapkan hidangan/produk pesanan Anda.'}
                                {step.key === 'ready' && (
                                  order.fulfillmentType === 'delivery'
                                    ? 'Pesanan siap dikirim oleh kurir.'
                                    : 'Pesanan siap diambil di konter pelayanan.'
                                )}
                                {step.key === 'delivering' && 'Kurir toko sedang mengantarkan pesanan Anda ke alamat tujuan.'}
                                {step.key === 'completed' && 'Pesanan selesai diserahkan. Selamat menikmati!'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Receipt / Order Summary Box */}
            <div className="glass rounded-3xl p-6 border border-slate-800/80">
              <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-850 pb-3">
                <FileText className="w-4 h-4 text-emerald-450" />
                <span>Rincian Struk Pelacakan</span>
              </h3>

              {/* Meta information */}
              <div className="flex flex-col gap-2 p-3 bg-slate-950/50 border border-slate-900 rounded-2xl mb-4 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pelanggan:</span>
                  <span className="font-bold text-white">{order.customerName}</span>
                </div>
                {order.maskedPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. WhatsApp:</span>
                    <span className="font-bold text-white font-mono">{order.maskedPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipe Pelayanan:</span>
                  <span className="font-bold text-white uppercase">
                    {order.fulfillmentType === 'dine_in' ? 'Makan di Tempat' : order.fulfillmentType === 'pickup' ? 'Ambil Sendiri' : 'Delivery'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-900 pt-2 mt-1">
                  <span className="text-slate-500">Waktu Order:</span>
                  <span className="text-slate-350">{formatDate(order.createdAt)}</span>
                </div>

                {/* Delivery specific data */}
                {order.fulfillmentType === 'delivery' && (
                  <div className="flex flex-col gap-2 border-t border-slate-900 pt-2.5 mt-1">
                    <span className="font-mono text-emerald-400 font-bold uppercase text-[8px] tracking-wider">Detail Delivery:</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Penerima:</span>
                      <span className="font-bold text-white">{order.recipientName || '-'}</span>
                    </div>
                    {order.maskedDeliveryPhone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">No. WA Penerima:</span>
                        <span className="font-bold text-white font-mono">{order.maskedDeliveryPhone}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 text-slate-500 mt-0.5">
                      <span>Alamat Kirim:</span>
                      <span className="text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-900 leading-normal font-sans text-[10px]">
                        {order.deliveryAddress || '-'}
                      </span>
                    </div>
                    {order.deliveryDistanceKm !== null && order.deliveryDistanceKm > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jarak:</span>
                        <span className="font-bold text-white">{order.deliveryDistanceKm} KM</span>
                      </div>
                    )}
                  </div>
                )}
                
                {order.notes && (
                  <div className="text-[10px] text-amber-400/80 italic mt-1.5 pt-2 border-t border-slate-900">
                    Catatan: &ldquo;{order.notes}&rdquo;
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-2 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <div>
                      <p className="font-bold text-slate-200">{item.product_name}</p>
                      <p className="text-[9px] text-slate-550">{item.quantity} x {formatRupiah(item.price)}</p>
                    </div>
                    <span className="font-bold text-slate-350">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}

                {/* Delivery fee listing if delivery */}
                {order.fulfillmentType === 'delivery' && (
                  <div className="flex justify-between items-center py-1 border-t border-slate-900 text-slate-500">
                    <span>Ongkos Kirim:</span>
                    {order.freeDeliveryApplied ? (
                      <span className="font-bold text-emerald-400 uppercase text-[9px]">Gratis Ongkir</span>
                    ) : (
                      <span className="font-bold text-slate-350">{formatRupiah(order.deliveryFeeAmount || 0)}</span>
                    )}
                  </div>
                )}

                {/* Delivery admin fee listing if applicable */}
                {order.fulfillmentType === 'delivery' && order.deliveryAdminFeeAmount !== null && order.deliveryAdminFeeAmount > 0 && (
                  <div className="flex justify-between items-center py-1 text-slate-500">
                    <span>Biaya Admin Delivery:</span>
                    <span className="font-bold text-slate-350">{formatRupiah(order.deliveryAdminFeeAmount)}</span>
                  </div>
                )}

                {/* Total box */}
                <div className="flex justify-between items-center border-t border-slate-800 pt-3 mt-2 text-sm font-black">
                  <span className="text-white">Total Tagihan:</span>
                  <span className="text-emerald-450 text-base">{formatRupiah(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Refresh Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fetchTrackingStatus(order.trackingCode, true)}
                disabled={isSearchLoading}
                className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-450 ${isSearchLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
                         <button
                type="button"
                onClick={() => window.print()}
                className="py-3 px-4 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-450" />
                <span>Cetak / PDF</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
