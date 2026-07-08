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
  LogOut
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { authService, UserProfile } from '../../services/authService';
import { Order, OrderStatus } from '../../types';
import { formatRupiah } from '../../utils/format';

export default function CashierDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Antrean Aktif');
  
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

  // Track session on mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
    } else {
      setTimeout(() => {
        setUser(currentUser);
        setIsAuthenticated(true);
        setIsLoading(false);
      }, 0);
    }
  }, [router]);

  const handleLogout = () => {
    authService.logout();
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
      return o.status === 'Paid' || o.status === 'Processing';
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
  const selectedOrder = filteredOrders.find((o) => o.id === selectedOrderId) || (filteredOrders.length > 0 ? filteredOrders[0] : null);

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
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Section: Order Lists */}
        <div className="flex-1 flex flex-col gap-4">
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
            <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
              {filteredOrders.map((ord) => {
                const isSelected = selectedOrder?.id === ord.id;
                
                const statusLabels: { [k: string]: string } = {
                  'Waiting for Payment': 'Menunggu Pembayaran',
                  'Paid': 'Lunas',
                  'Processing': 'Diproses',
                  'Ready': 'Siap',
                  'Completed': 'Selesai',
                  'Cancelled': 'Batal',
                };
                
                const statusBadgeColors: { [k: string]: string } = {
                  'Waiting for Payment': 'bg-amber-500/10 text-amber-500 border border-amber-500/10',
                  'Paid': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10',
                  'Processing': 'bg-blue-500/10 text-blue-400 border border-blue-500/10',
                  'Ready': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10',
                  'Completed': 'bg-slate-800 text-slate-400 border border-slate-700',
                  'Cancelled': 'bg-rose-500/10 text-rose-400 border border-rose-500/10',
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
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{ord.customerName}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeColors[ord.status]}`}>
                            {statusLabels[ord.status]}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {ord.items.length} Item &bull; {formatRupiah(ord.totalAmount)} &bull; {ord.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="text-[10px] font-mono">{new Date(ord.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Section: Detailed Order Drawer/Panel */}
        <div className="w-full lg:w-96 bg-slate-900 border border-slate-850 rounded-2xl p-6 h-fit lg:sticky lg:top-24 flex flex-col gap-6">
          {selectedOrder ? (
            <>
              {/* Header Details */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Rincian Antrean</span>
                    <h2 className="text-2xl font-black text-white mt-0.5">{selectedOrder.queueNumber}</h2>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    ID: {selectedOrder.id.slice(6, 14).toUpperCase()}
                  </span>
                </div>
                
                {/* Customer Meta */}
                <div className="flex flex-col gap-1.5 mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Nama: <strong className="text-white">{selectedOrder.customerName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Telepon: <strong className="text-white">{selectedOrder.customerPhone}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 border-t border-slate-900 pt-1.5 mt-0.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Metode: <strong className="text-white">{selectedOrder.paymentMethod}</strong></span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="text-[11px] text-amber-400 border-t border-slate-900 pt-1.5 mt-0.5 italic">
                      Catatan: &ldquo;{selectedOrder.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-48 overflow-y-auto pr-1">
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Pesanan Pelanggan</h4>
                <div className="flex flex-col gap-3">
                  {selectedOrder.items.map((item) => (
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

              {/* Bill Details */}
              <div className="border-t border-slate-850 pt-4 bg-slate-950/20 p-3 rounded-xl">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Pembayaran:</span>
                  <span className={`font-bold ${selectedOrder.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {selectedOrder.paymentStatus === 'Paid' ? 'LUNAS' : 'Belum Bayar'}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-white">
                  <span>Total Tagihan:</span>
                  <span className="text-emerald-400">{formatRupiah(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Workflow Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Perbarui Status</h4>
                
                {/* State-Machine buttons */}
                {selectedOrder.status === 'Waiting for Payment' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'Paid')}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Konfirmasi Pembayaran Lunas</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelled')}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 border border-slate-700 hover:border-rose-500/20 font-bold transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Batalkan Pesanan</span>
                    </button>
                  </>
                )}

                {selectedOrder.status === 'Paid' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Processing')}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-500/10"
                  >
                    <Play className="w-4 h-4" />
                    <span>Mulai Proses / Kirim Dapur</span>
                  </button>
                )}

                {selectedOrder.status === 'Processing' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Ready')}
                    className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-500/10"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Tandai Siap Saji</span>
                  </button>
                )}

                {selectedOrder.status === 'Ready' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Completed')}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-500/10"
                  >
                    <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                    <span>Selesaikan / Ambil</span>
                  </button>
                )}

                {selectedOrder.status === 'Completed' && (
                  <div className="p-3 bg-slate-950 text-center rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Pesanan ini telah Selesai dan Lunas.</span>
                  </div>
                )}

                {selectedOrder.status === 'Cancelled' && (
                  <div className="p-3 bg-rose-500/10 text-center rounded-xl border border-rose-500/20 text-xs text-rose-400 flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5" />
                    <span>Pesanan Dibatalkan. Stok dikembalikan.</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-slate-700" />
              <p>Pilih salah satu pesanan untuk melihat detail dan mengupdate status.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
