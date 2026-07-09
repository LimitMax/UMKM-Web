'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ShoppingBag,
  User, 
  Phone, 
  Check, 
  Play, 
  CheckSquare, 
  XCircle, 
  ChevronRight, 
  Volume2, 
  Home, 
  CreditCard,
  FileText,
  CheckCircle2,
  LogOut,
  Printer,
  X
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { businessService } from '../../services/businessService';
import DemoRoleSwitcher from '../../components/DemoRoleSwitcher';
import RoleGuardBanner from '../../components/RoleGuardBanner';
import { authService as mockAuthService } from '../../services/authService';
import { useAuth } from '../../components/AuthProvider';
import { Order, OrderStatus, BusinessProfile } from '../../types';
import { formatRupiah } from '../../utils/format';
import { formatEtaMinutes, formatEstimatedTime } from '../../utils/etaHelpers';
import { Clock } from 'lucide-react';

export default function CashierDashboard() {
  const router = useRouter();
  const { user: supabaseUser, profile, isDemoMode, isSupabaseConfigured, loading: authLoading, signOut } = useAuth();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => businessService.getProfileSync());
  const [isLoading, setIsLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Antrean Aktif');

  // ETA adjustment state (Phase 6.8)
  const [etaAdjustDelta, setEtaAdjustDelta] = useState<number>(0);
  const [etaAdjustReason, setEtaAdjustReason] = useState<string>('');
  const [etaAdjustLoading, setEtaAdjustLoading] = useState<boolean>(false);
  const [etaAdjustSuccess, setEtaAdjustSuccess] = useState<boolean>(false);
  
  // Track previous order count to play notification chime on new order
  const prevOrdersCountRef = useRef<number | null>(null);

  // Web Audio synth double chime
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Beep 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);
      
      // Beep 2 (delayed slightly)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 120);
    } catch {
      console.log('Audio chime blocked by browser autoplay policy.');
    }
  };

  // Track session on mount & react to auth loading changes
  useEffect(() => {
    if (!authLoading) {
      if (isSupabaseConfigured && !isDemoMode) {
        if (!supabaseUser || !profile) {
          setTimeout(() => {
            router.push('/login');
          }, 0);
        } else {
          setTimeout(async () => {
            try {
              const p = await businessService.getProfile();
              setBusinessProfile(p);
            } catch (err) {
              console.error('Failed to load profile in cashier:', err);
            }
            setUser({
              name: profile.full_name,
              role: profile.role === 'admin' ? 'Owner/Admin' : 'Kasir',
            });
            setIsAuthenticated(true);
            setIsLoading(false);
          }, 0);
        }
      } else {
        // Demo mode check
        const mockSession = mockAuthService.getCurrentUser();
        if (!mockSession) {
          setTimeout(() => {
            router.push('/login');
          }, 0);
        } else {
          setTimeout(async () => {
            try {
              const p = await businessService.getProfile();
              setBusinessProfile(p);
            } catch (err) {
              console.error('Failed to load profile in cashier:', err);
            }
            setUser({
              name: mockSession.name,
              role: mockSession.role === 'admin' ? 'Owner Demo' : 'Kasir Demo',
            });
            setIsAuthenticated(true);
            setIsLoading(false);
          }, 0);
        }
      }
    }
  }, [supabaseUser, profile, isDemoMode, isSupabaseConfigured, authLoading, router]);

  // Listen for Escape key to close drawer (Phase 6.9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOrderId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Poll orders
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      const allOrders = await orderService.getOrders();
      setOrders(allOrders);

      // Play chime if a new order is received
      if (prevOrdersCountRef.current !== null && allOrders.length > prevOrdersCountRef.current) {
        playNotificationChime();
      }
      
      // Update ref
      prevOrdersCountRef.current = allOrders.length;
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Actions handler
  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(id, status);
      // Update local state instantly
      const allOrders = await orderService.getOrders();
      setOrders(allOrders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah status.');
    }
  };

  // Filter orders matching search and tabs
  const filteredOrders = orders.filter((o) => {
    // Search filter
    const matchesSearch = 
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.queueNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;

    // Tabs filter
    if (statusFilter === 'Antrean Aktif') {
      return o.status !== 'Completed' && o.status !== 'Cancelled';
    } else if (statusFilter === 'Menunggu Pembayaran') {
      return o.status === 'Waiting for Payment';
    } else if (statusFilter === 'Diproses') {
      return o.status === 'Paid' || o.status === 'Processing' || o.status === 'delivering';
    } else if (statusFilter === 'Siap') {
      return o.status === 'Ready';
    } else if (statusFilter === 'Selesai') {
      return o.status === 'Completed';
    } else if (statusFilter === 'Dibatalkan') {
      return o.status === 'Cancelled';
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first

  // Selected order details
  const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) || null : null;

  // Filters calculation
  const todayOrders = orders.filter((o) => {
    const today = new Date().toDateString();
    return new Date(o.createdAt).toDateString() === today;
  });

  const activeQueues = orders.filter(
    (o) => o.status !== 'Completed' && o.status !== 'Cancelled'
  );

  // Today stats
  const paidToday = todayOrders.filter((o) => o.paymentStatus === 'Paid' && o.status !== 'Cancelled');
  const todayRevenue = paidToday.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayCount = todayOrders.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-xs font-mono animate-pulse">Memverifikasi sesi kasir...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-550 text-xs font-mono animate-pulse">Mengalihkan ke halaman masuk...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all">
              <Home className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-extrabold text-xl text-white">Kasir Pintar</h1>
              <p className="text-xs text-emerald-400 font-mono">Dashboard Manajemen Antrean & Kasir</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DemoRoleSwitcher />
            {/* User Meta display */}
            {user && (
              <div className="hidden md:block text-right">
                <span className="block text-[10px] text-slate-305 font-bold leading-none">{user.name}</span>
                <span className="block text-[8px] font-mono text-emerald-400 uppercase tracking-widest mt-0.5">{user.role}</span>
              </div>
            )}

            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-750 transition-all"
              title="Keluar Sesi"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <button 
              onClick={playNotificationChime} 
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-all"
              title="Test Audio Bell"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Quick stats */}
            <div className="flex gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-right">
                <span className="block text-[10px] font-mono text-slate-500 uppercase">Omzet Hari Ini</span>
                <span className="text-emerald-400 font-bold text-sm">{formatRupiah(todayRevenue)}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-right">
                <span className="block text-[10px] font-mono text-slate-500 uppercase">Total Pesanan</span>
                <span className="text-slate-200 font-bold text-sm">{todayCount} Pesanan</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <RoleGuardBanner allowedRoles={['admin', 'cashier']} currentPageName="Dashboard Kasir" />
        <div className="w-full flex flex-col gap-6">
        
        {/* Left Section: Order Lists */}
        <div className="w-full flex flex-col gap-4">
          {/* Active queue codes row */}
          {activeQueues.length > 0 && (
            <div className="glass rounded-xl p-3 border border-slate-800 flex items-center gap-2 overflow-x-auto">
              <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider uppercase border-r border-slate-800 pr-3 flex-shrink-0">
                Antrean Aktif
              </span>
              <div className="flex gap-1.5 overflow-x-auto">
                {activeQueues.map((o) => {
                  const statusColors: { [k: string]: string } = {
                    'Waiting for Payment': 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                    'Paid': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                    'Processing': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                    'Ready': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                  };
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        selectedOrderId === o.id
                          ? 'ring-2 ring-emerald-400 scale-105'
                          : ''
                      } ${statusColors[o.status] || 'bg-slate-800 text-slate-400'}`}
                    >
                      {o.queueNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search bar & Status tabs */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor antrean (A001) atau nama pelanggan..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-900">
              {[
                'Antrean Aktif',
                'Menunggu Pembayaran',
                'Diproses',
                'Siap',
                'Selesai',
                'Dibatalkan'
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    statusFilter === tab
                      ? 'bg-slate-850 text-emerald-400 border border-emerald-500/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Order Cards List */}
          {filteredOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-slate-900 rounded-2xl">
              <ShoppingBag className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-slate-500 text-xs">Tidak ada pesanan.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[650px] overflow-y-auto pr-1">
              {filteredOrders.map((ord) => {
                const isSelected = selectedOrder?.id === ord.id;
                
                const statusLabels: { [k: string]: string } = {
                  'Waiting for Payment': 'Menunggu Pembayaran',
                  'Paid': 'Lunas',
                  'Processing': 'Diproses',
                  'Ready': 'Siap',
                  'delivering': 'Sedang Dikirim',
                  'Completed': 'Selesai',
                  'Cancelled': 'Batal',
                };
                
                const statusBadgeColors: { [k: string]: string } = {
                  'Waiting for Payment': 'bg-amber-500/10 text-amber-500 border border-amber-500/10',
                  'Paid': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10',
                  'Processing': 'bg-blue-500/10 text-blue-400 border border-blue-500/10',
                  'Ready': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10',
                  'delivering': 'bg-amber-500/10 text-amber-400 border border-amber-500/10',
                  'Completed': 'bg-slate-800 text-slate-400 border border-slate-700',
                  'Cancelled': 'bg-rose-500/10 text-rose-400 border border-rose-500/10',
                };

                const getOrderBadgeLabel = (status: string, fulfillment?: string) => {
                  if (status === 'Ready') {
                    if (fulfillment === 'delivery') return 'Siap Dikirim';
                    if (fulfillment === 'pickup') return 'Siap Diambil';
                    return 'Siap Disajikan';
                  }
                  return statusLabels[status] || status;
                };

                return (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/50 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-900/40 border-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Large Queue Bubble */}
                      <span className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-black text-lg text-emerald-400">
                        {ord.queueNumber}
                      </span>
                      
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{ord.customerName}</h4>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            ord.paymentStatus === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                          }`}>
                            {ord.paymentStatus === 'Paid' ? 'Lunas' : 'Belum Bayar'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusBadgeColors[ord.status]}`}>
                            {getOrderBadgeLabel(ord.status, ord.fulfillmentType)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            ord.fulfillmentType === 'delivery'
                              ? 'bg-amber-555/15 text-amber-450 border border-amber-500/20'
                              : ord.fulfillmentType === 'pickup'
                                ? 'bg-blue-555/15 text-blue-450 border border-blue-500/20'
                                : 'bg-slate-800/80 text-slate-455 border border-slate-700/50'
                          }`}>
                            {ord.fulfillmentType === 'delivery'
                              ? 'Delivery'
                              : ord.fulfillmentType === 'pickup'
                                ? 'Ambil'
                                : 'Meja'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {ord.items.length} Item &bull; <span className="text-slate-300 font-semibold">{formatRupiah(ord.totalAmount)}</span> &bull; {ord.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 text-slate-500 flex-shrink-0">
                      <span className="text-[10px] font-mono">{new Date(ord.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-slate-400 hover:text-emerald-400 transition-all">
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Slide-over Panel (Phase 6.9) */}
        {selectedOrder && (() => {
          const statusLabels: { [k: string]: string } = {
            'Waiting for Payment': 'Menunggu Pembayaran',
            'Paid': 'Lunas',
            'Processing': 'Diproses',
            'Ready': 'Siap',
            'delivering': 'Sedang Dikirim',
            'Completed': 'Selesai',
            'Cancelled': 'Batal',
          };
          
          const statusBadgeColors: { [k: string]: string } = {
            'Waiting for Payment': 'bg-amber-500/10 text-amber-500 border border-amber-500/10',
            'Paid': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10',
            'Processing': 'bg-blue-500/10 text-blue-400 border border-blue-500/10',
            'Ready': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10',
            'delivering': 'bg-amber-500/10 text-amber-400 border border-amber-500/10',
            'Completed': 'bg-slate-850 text-slate-400 border border-slate-750',
            'Cancelled': 'bg-rose-500/10 text-rose-450 border border-rose-500/15',
          };

          const getOrderBadgeLabel = (status: string, fulfillment?: string) => {
            if (status === 'Ready') {
              if (fulfillment === 'delivery') return 'Siap Dikirim';
              if (fulfillment === 'pickup') return 'Siap Diambil';
              return 'Siap Disajikan';
            }
            return statusLabels[status] || status;
          };

          return (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setSelectedOrderId(null)}
              />
              
              {/* Drawer Container */}
              <div className="relative w-full sm:w-[480px] bg-slate-900 border-l border-slate-850 h-full flex flex-col shadow-2xl z-10 transform transition-transform duration-300 translate-x-0">
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex-shrink-0 flex items-start justify-between bg-slate-950/40">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Rincian Antrean</span>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <h2 className="text-2xl font-black text-white leading-none">{selectedOrder.queueNumber}</h2>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeColors[selectedOrder.status]}`}>
                        {getOrderBadgeLabel(selectedOrder.status, selectedOrder.fulfillmentType)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedOrder.fulfillmentType === 'delivery'
                          ? 'bg-amber-555/15 text-amber-450 border border-amber-500/20'
                          : selectedOrder.fulfillmentType === 'pickup'
                            ? 'bg-blue-555/15 text-blue-450 border border-blue-500/20'
                            : 'bg-slate-800/80 text-slate-455 border border-slate-700/50'
                      }`}>
                        {selectedOrder.fulfillmentType === 'delivery' ? 'Delivery' : selectedOrder.fulfillmentType === 'pickup' ? 'Ambil' : 'Meja'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-2">ID: {selectedOrder.id.toUpperCase()}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedOrderId(null)}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                  {/* Customer Info */}
                  <div className="flex flex-col gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nama: <strong className="text-white">{selectedOrder.customerName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Telepon: <strong className="text-white">{selectedOrder.customerPhone || '-'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-2 mt-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      <span>Metode: <strong className="text-white">{selectedOrder.paymentMethod}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-2 mt-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                      <span>Layanan: <strong className="text-white">
                        {selectedOrder.fulfillmentType === 'delivery' ? 'Delivery' : selectedOrder.fulfillmentType === 'pickup' ? 'Ambil Sendiri' : 'Makan di Tempat'}
                      </strong></span>
                    </div>
                    {selectedOrder.notes && (
                      <div className="text-[11px] text-amber-400 border-t border-slate-900 pt-2 mt-1 italic">
                        Catatan: &ldquo;{selectedOrder.notes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Delivery details if fulfillment is delivery */}
                  {selectedOrder.fulfillmentType === 'delivery' && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/25 text-xs flex flex-col gap-1.5">
                      <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider border-b border-slate-850 pb-1 mb-1">
                        Detail Pengiriman
                      </div>
                      <div className="text-slate-400">
                        Penerima: <strong className="text-slate-200">{selectedOrder.recipientName || '-'}</strong>
                      </div>
                      <div className="text-slate-400">
                        WhatsApp: <strong className="text-slate-200">{selectedOrder.deliveryPhone || '-'}</strong>
                      </div>
                      <div className="text-slate-400 flex flex-col mt-1">
                        <span>Alamat Pengantaran:</span>
                        <span className="text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 mt-1 leading-normal font-sans text-[11px]">
                          {selectedOrder.deliveryAddress || '-'}
                        </span>
                      </div>
                      {selectedOrder.deliveryNotes && (
                        <div className="text-slate-400 italic mt-1 bg-slate-900/40 p-2 rounded border border-slate-800/40 text-[11px]">
                          Catatan Kurir: &ldquo;{selectedOrder.deliveryNotes}&rdquo;
                        </div>
                      )}
                      {selectedOrder.deliveryDistanceKm !== undefined && selectedOrder.deliveryDistanceKm > 0 && (
                        <div className="text-slate-400 mt-1">
                          Jarak: <strong className="text-slate-200">{selectedOrder.deliveryDistanceKm} KM</strong>
                          {selectedOrder.deliveryDistanceSource === 'mock' && <span className="text-[9px] text-slate-500 ml-1">(Simulasi)</span>}
                        </div>
                      )}
                      {selectedOrder.deliveryFeeCalculationType && (
                        <div className="text-slate-400">
                          Tipe Tarif: <strong className="text-slate-200">
                            {selectedOrder.deliveryFeeCalculationType === 'distance_based' ? 'Berdasarkan Jarak' : 'Flat'}
                          </strong>
                        </div>
                      )}
                      {selectedOrder.deliveryDistanceKm !== undefined && 
                       selectedOrder.deliveryDistanceKm > (businessProfile?.deliverySettings?.maxDeliveryDistanceKm ?? 10) && (
                        <div className="mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] leading-normal font-mono">
                          ⚠️ Jarak melebihi batas maks ({businessProfile?.deliverySettings?.maxDeliveryDistanceKm ?? 10} KM)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items List */}
                  <div>
                    <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 font-bold">Pesanan Pelanggan</h4>
                    <div className="flex flex-col gap-2">
                      {selectedOrder.items.map((item) => (
                        <div key={item.productId} className="flex justify-between items-center text-xs text-slate-305 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                          <div>
                            <p className="font-semibold text-slate-200">{item.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{item.quantity} x {formatRupiah(item.price)}</p>
                          </div>
                          <span className="font-bold text-slate-200 font-mono">{formatRupiah(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bill details */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-2">
                    {(selectedOrder.subtotal !== undefined && 
                      (selectedOrder.subtotal !== selectedOrder.totalAmount || selectedOrder.fulfillmentType === 'delivery')) && (
                      <>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Subtotal:</span>
                          <span className="text-slate-200 font-mono">{formatRupiah(selectedOrder.subtotal)}</span>
                        </div>
                        {selectedOrder.serviceChargeAmount !== undefined && selectedOrder.serviceChargeAmount > 0 && (
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Biaya Layanan:</span>
                            <span className="text-slate-200 font-mono">{formatRupiah(selectedOrder.serviceChargeAmount)}</span>
                          </div>
                        )}
                        {selectedOrder.taxAmount !== undefined && selectedOrder.taxAmount > 0 && (
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Pajak:</span>
                            <span className="text-slate-200 font-mono">{formatRupiah(selectedOrder.taxAmount)}</span>
                          </div>
                        )}
                        {selectedOrder.fulfillmentType === 'delivery' && (
                          <>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>Ongkos Kirim:</span>
                              {selectedOrder.freeDeliveryApplied ? (
                                <span className="text-emerald-400 font-bold text-[10px]">Gratis Ongkir</span>
                              ) : (
                                <span className="text-slate-200 font-mono">{formatRupiah(selectedOrder.deliveryFeeAmount ?? 0)}</span>
                              )}
                            </div>
                            {selectedOrder.deliveryAdminFeeAmount !== undefined && selectedOrder.deliveryAdminFeeAmount > 0 && (
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>Biaya Admin:</span>
                                <span className="text-slate-200 font-mono">{formatRupiah(selectedOrder.deliveryAdminFeeAmount)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                    <div className="flex justify-between text-xs text-slate-400 border-t border-slate-900 pt-2 mt-1">
                      <span>Status Bayar:</span>
                      <span className={`font-bold ${selectedOrder.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-500'}`}>
                        {selectedOrder.paymentStatus === 'Paid' ? 'LUNAS' : 'Belum Bayar'}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-white border-t border-slate-900 pt-2">
                      <span>Total Tagihan:</span>
                      <span className="text-emerald-400 text-sm font-mono">{formatRupiah(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>

                  {/* ETA Section (Phase 6.8) */}
                  {businessProfile?.etaSettings?.etaEnabled && selectedOrder.estimatedTotalMinutes !== undefined && (
                    <div className="border border-amber-500/15 rounded-xl p-3 bg-amber-500/4 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-mono uppercase tracking-wider text-amber-400/70 flex items-center gap-1.5 font-bold">
                          <Clock className="w-3 h-3" /> Estimasi Waktu
                        </h4>
                        {selectedOrder.etaManuallyAdjusted && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold uppercase tracking-wider">Disesuaikan</span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Total ETA</span>
                        <span className="font-bold text-amber-300 font-mono">{formatEtaMinutes(selectedOrder.estimatedTotalMinutes)}</span>
                      </div>
                      {selectedOrder.estimatedReadyAt && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Perkiraan Siap</span>
                          <span className="font-bold text-white font-mono">{formatEstimatedTime(selectedOrder.estimatedReadyAt)}</span>
                        </div>
                      )}
                      {selectedOrder.estimatedArrivalAt && selectedOrder.fulfillmentType === 'delivery' && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Perkiraan Sampai</span>
                          <span className="font-bold text-white font-mono">{formatEstimatedTime(selectedOrder.estimatedArrivalAt)}</span>
                        </div>
                      )}
                      {selectedOrder.etaAdjustmentReason && (
                        <div className="text-[10px] text-amber-450 bg-amber-950/20 border border-amber-500/10 rounded-lg p-2 leading-relaxed">
                          💡 <strong>Alasan Penyesuaian:</strong> {selectedOrder.etaAdjustmentReason}
                        </div>
                      )}

                      {/* Manual Adjustment Form */}
                      <div className="border-t border-amber-500/10 pt-3 flex flex-col gap-2">
                        <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Ubah Estimasi (kasir)</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEtaAdjustDelta((d) => d - 5)}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer transition-all border border-slate-700"
                            >-5</button>
                            <span className="w-12 text-center text-xs font-bold text-white font-mono">{etaAdjustDelta > 0 ? `+${etaAdjustDelta}` : etaAdjustDelta} mnt</span>
                            <button
                              type="button"
                              onClick={() => setEtaAdjustDelta((d) => d + 5)}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer transition-all border border-slate-700"
                            >+5</button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={etaAdjustReason}
                          onChange={(e) => setEtaAdjustReason(e.target.value)}
                          placeholder="Alasan (mis: antrean panjang, bahan habis...)"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          disabled={etaAdjustDelta === 0 || !etaAdjustReason.trim() || etaAdjustLoading}
                          onClick={async () => {
                            if (!etaAdjustReason.trim() || etaAdjustDelta === 0) return;
                            setEtaAdjustLoading(true);
                            try {
                              await orderService.updateOrderEta(selectedOrder.id, etaAdjustDelta, etaAdjustReason);
                              setEtaAdjustDelta(0);
                              setEtaAdjustReason('');
                              setEtaAdjustSuccess(true);
                              // Instantly refresh local state
                              const allOrders = await orderService.getOrders();
                              setOrders(allOrders);
                              setTimeout(() => setEtaAdjustSuccess(false), 2000);
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Gagal mengubah ETA.');
                            } finally {
                              setEtaAdjustLoading(false);
                            }
                          }}
                          className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{etaAdjustLoading ? 'Menyimpan...' : etaAdjustSuccess ? '✓ Tersimpan' : 'Simpan Perubahan ETA'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Footer */}
                <div className="p-5 border-t border-slate-800 bg-slate-900 flex-shrink-0 flex flex-col gap-3">
                  {/* State-Machine buttons */}
                  <div className="flex flex-col gap-2">
                    {selectedOrder.status === 'Waiting for Payment' && (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'Paid')}
                          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md hover:shadow-emerald-500/10"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Konfirmasi Pembayaran Lunas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelled')}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-450 text-slate-400 border border-slate-750 hover:border-rose-500/20 font-bold transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Batalkan Pesanan</span>
                        </button>
                      </div>
                    )}

                    {selectedOrder.status === 'Paid' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Processing')}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-500/10 cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>Mulai Proses</span>
                      </button>
                    )}

                    {selectedOrder.status === 'Processing' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Ready')}
                        className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-500/10 cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>
                          {selectedOrder.fulfillmentType === 'delivery' 
                            ? 'Tandai Siap Dikirim' 
                            : selectedOrder.fulfillmentType === 'pickup' 
                              ? 'Tandai Siap Diambil' 
                              : 'Tandai Siap Disajikan'}
                        </span>
                      </button>
                    )}

                    {selectedOrder.status === 'Ready' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedOrder.fulfillmentType === 'delivery') {
                            handleUpdateStatus(selectedOrder.id, 'delivering');
                          } else {
                            handleUpdateStatus(selectedOrder.id, 'Completed');
                          }
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          {selectedOrder.fulfillmentType === 'delivery' 
                            ? 'Mulai Pengiriman' 
                            : 'Selesaikan / Ambil'}
                        </span>
                      </button>
                    )}

                    {selectedOrder.status === 'delivering' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Completed')}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                        <span>Selesaikan Pesanan</span>
                      </button>
                    )}

                    {selectedOrder.status === 'Completed' && (
                      <div className="p-2.5 bg-emerald-950/20 text-center rounded-xl border border-emerald-500/15 text-[11px] text-emerald-400 flex items-center justify-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pesanan ini telah Selesai dan Lunas.</span>
                      </div>
                    )}

                    {selectedOrder.status === 'Cancelled' && (
                      <div className="p-2.5 bg-rose-950/20 text-center rounded-xl border border-rose-500/15 text-[11px] text-rose-450 flex items-center justify-center gap-1.5 font-semibold">
                        <XCircle className="w-4 h-4" />
                        <span>Pesanan Dibatalkan. Stok dikembalikan.</span>
                      </div>
                    )}
                  </div>

                  {/* Receipt links */}
                  <div className="flex gap-2 border-t border-slate-800 pt-2.5">
                    <button
                      type="button"
                      onClick={() => window.open(`/receipt/${selectedOrder.id}`, '_blank')}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-750 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lihat Struk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/receipt/${selectedOrder.id}?print=true`, '_blank')}
                      className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Struk</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      </main>
    </div>
  );
}
