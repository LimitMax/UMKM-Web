'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Sparkles, 
  Send, 
  Copy, 
  Lightbulb, 
  TrendingUp, 
  Check,
  Download,
  Printer,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { insightService } from '../../../services/insightService';
import { orderService } from '../../../services/orderService';
import { productService } from '../../../services/productService';
import { Order, Product, AIInsight } from '../../../types';
import { formatRupiah } from '../../../utils/format';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export default function AdminInsightsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [insight, setInsight] = useState<AIInsight | null>(null);

  // Chat states
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Halo! Saya AI Pilot, asisten bisnis pintar Anda. Tanyakan apa saja tentang penjualan, stok produk, atau rekomendasi promo toko Anda hari ini!',
      timestamp: new Date(),
    },
  ]);
  const [activePromoId, setActivePromoId] = useState<string>('promo-bundle');
  const [isCopiedWA, setIsCopiedWA] = useState(false);
  const [isCopiedIG, setIsCopiedIG] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const loadData = async () => {
      const o = await orderService.getOrders();
      const p = await productService.getProducts();
      setOrders(o);
      setProducts(p);
      
      // Generate AI Insights from current actual database
      const res = insightService.generateInsights(o, p);
      setInsight(res);
      if (res.promoRecommendations && res.promoRecommendations.length > 0) {
        setActivePromoId(res.promoRecommendations[0].id);
      }
    };
    loadData();
  }, []);

  const copyWA = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedWA(true);
    setTimeout(() => setIsCopiedWA(false), 2000);
  };

  const copyIG = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedIG(true);
    setTimeout(() => setIsCopiedIG(false), 2000);
  };

  const handleDownloadPoster = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    }, 1200);
  };

  const handlePrintPoster = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 2000);
    }, 1200);
  };

  // Process Chatbot heuristic answers
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newMsg: ChatMessage = {
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    // Generate simulated AI reply
    setTimeout(() => {
      const reply = generateAiReply(userText);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply,
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  // Chatbot intelligence simulation (rule-based NLP)
  const generateAiReply = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    const activeOrders = orders.filter((o) => o.status !== 'Cancelled');

    // 1. Query about Kopi / Drink Sales
    if (lowerQuery.includes('kopi') || lowerQuery.includes('minum')) {
      const kopiItems = activeOrders.flatMap(o => o.items).filter(item => item.name.toLowerCase().includes('kopi') || item.name.toLowerCase().includes('teh'));
      const totalKopiQty = kopiItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalKopiRev = kopiItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      if (totalKopiQty > 0) {
        return `Penjualan minuman/kopi hari ini tercatat sebanyak ${totalKopiQty} cup dengan total omzet penjualan mencapai ${formatRupiah(totalKopiRev)}. Produk minuman terpopuler adalah Es Kopi Susu Gula Aren.`;
      } else {
        return `Belum ada penjualan minuman atau kopi hari ini yang tercatat di database kasir. Pastikan status pesanan telah dikonfirmasi "Sudah Bayar" atau "Selesai".`;
      }
    }

    // 2. Query about Food / Makanan Sales
    if (lowerQuery.includes('makan') || lowerQuery.includes('ayam') || lowerQuery.includes('mie')) {
      const foodItems = activeOrders.flatMap(o => o.items).filter(item => 
        item.name.toLowerCase().includes('geprek') || 
        item.name.toLowerCase().includes('mie') || 
        item.name.toLowerCase().includes('roti')
      );
      const totalFoodQty = foodItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalFoodRev = foodItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      if (totalFoodQty > 0) {
        return `Penjualan makanan hari ini tercatat sebanyak ${totalFoodQty} porsi dengan omzet ${formatRupiah(totalFoodRev)}. Ayam Geprek Level 5 menjadi makanan utama terfavorit.`;
      } else {
        return `Belum ada pesanan makanan (seperti Ayam Geprek atau Mie Goreng) yang lunas hari ini.`;
      }
    }

    // 3. Query about Low Stock
    if (lowerQuery.includes('stok') || lowerQuery.includes('habis') || lowerQuery.includes('limit')) {
      const lowStockList = products.filter((p) => p.isActive && p.stock <= 5);
      if (lowStockList.length > 0) {
        const listStr = lowStockList.map((p) => `- ${p.name} (Tersisa: ${p.stock} unit)`).join('\n');
        return `Perhatian! Beberapa produk berikut berada di bawah stok aman (<= 5 unit):\n\n${listStr}\n\nAI menyarankan Anda segera memesan bahan baku ke pemasok untuk menghindari kehilangan omzet penjualan.`;
      } else {
        return `Kabar baik! Semua stok produk Anda saat ini aman (di atas 5 unit). Tetap pantau secara berkala melalui menu Kelola Stok.`;
      }
    }

    // 4. Query about Promo recommendation
    if (lowerQuery.includes('promo') || lowerQuery.includes('diskon') || lowerQuery.includes('bundling')) {
      if (insight && activeOrders.length > 0) {
        return `AI menyarankan promo "${insight.suggestedPromo.title}": ${insight.suggestedPromo.description}\n\nAnda dapat mengunduh poster promo digital ini atau menyalin caption sosial medianya di tab 'Rekomendasi Promo' di sebelah kanan!`;
      }
      return `Untuk membuat rekomendasi promo terbaik, buatlah beberapa transaksi di menu antrean kasir terlebih dahulu agar AI memiliki cukup data untuk mendeteksi menu terpopuler Anda.`;
    }

    // 5. Query about general revenue
    if (lowerQuery.includes('omzet') || lowerQuery.includes('pendapatan') || lowerQuery.includes('duit') || lowerQuery.includes('penjualan')) {
      const paidOrders = activeOrders.filter(o => o.paymentStatus === 'Paid' || o.status === 'Completed');
      const totalRev = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return `Total omzet penjualan riil (sudah lunas) hari ini adalah ${formatRupiah(totalRev)} dari ${paidOrders.length} transaksi sukses. Rata-rata belanja pelanggan Anda adalah ${formatRupiah(paidOrders.length > 0 ? totalRev / paidOrders.length : 0)}.`;
    }

    // Default reply
    return `Pertanyaan menarik! Berdasarkan data penjualan toko Anda, produk terlaris saat ini adalah ${
      insight?.summary.includes('Es Kopi Susu') ? 'Es Kopi Susu Gula Aren' : 'Nasi Ayam Geprek'
    }. Anda dapat mengoptimalkan penjualan dengan menyebarkan kupon digital di Instagram atau mengatur harga kombo bundling untuk jam sibuk sore hari. Ada hal spesifik lain tentang stok atau omzet yang ingin Anda tanyakan?`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-emerald-400" />
          <span>AI Business Insights</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Analisis kecerdasan buatan berbasis transaksi harian Anda. Temukan peluang produk, optimalkan stok, dan buat materi promosi instan.
        </p>
      </div>

      {insight ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Core Insights (2 cols on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Sales Summary Insight */}
            <div className="glass rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-tr-3xl pointer-events-none" />
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
                <span>Analisis Kinerja Hari Ini</span>
              </h3>
              <p className="text-slate-350 text-xs leading-relaxed">
                {insight.summary}
              </p>
            </div>

            {/* AI Recommendations List */}
            <div className="glass rounded-3xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-4.5 h-4.5 text-emerald-400" />
                <span>Rekomendasi AI Pilot</span>
              </h3>
              
              <div className="flex flex-col gap-3">
                {insight.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-3 items-start bg-slate-950/40 p-3.5 rounded-2xl border border-slate-900">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tanya AI Pilot Chatbot Panel */}
            <div className="glass rounded-3xl p-6 border border-slate-850 flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 flex-shrink-0">
                <Brain className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                <span>Tanya AI Pilot (Simulasi Chat)</span>
              </h3>

              {/* Chat log wrapper */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 mb-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-900">
                {chatMessages.map((msg, idx) => {
                  const isAi = msg.sender === 'ai';
                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-3.5 max-w-[85%] ${
                        isAi ? 'self-start' : 'self-end flex-row-reverse'
                      }`}
                    >
                      {isAi && (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          AI
                        </div>
                      )}
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isAi 
                          ? 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-850'
                          : 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none'
                      }`}>
                        {msg.text.split('\n').map((para, i) => (
                          <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat form input */}
              <form onSubmit={handleSendChat} className="flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ketik pertanyaan (stok habis?, promo?, omzet?)..."
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/10"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Sleek Promo Hub/Campaign Panel */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Rekomendasi Kampanye Promo</span>
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  AI Hub
                </span>
              </h3>

              {/* Tab Switcher */}
              {insight.promoRecommendations && insight.promoRecommendations.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none border-b border-slate-800/60">
                  {insight.promoRecommendations.map((promo) => (
                    <button
                      key={promo.id}
                      onClick={() => setActivePromoId(promo.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        activePromoId === promo.id
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          : 'bg-slate-950/40 text-slate-550 border border-slate-900 hover:text-slate-300'
                      }`}
                    >
                      {promo.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Promo Details Display */}
              {(() => {
                const currentPromo = insight.promoRecommendations?.find(p => p.id === activePromoId) || insight.promoRecommendations?.[0];
                if (!currentPromo) return null;

                return (
                  <div className="flex flex-col gap-5">
                    {/* Header with Title and Confidence */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-extrabold text-white text-base leading-tight">
                          {currentPromo.suggestedPromoName}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {currentPromo.reason}
                        </p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                          <Award className="w-3.5 h-3.5" />
                          <span>{currentPromo.confidenceScore}% Akurasi</span>
                        </span>
                      </div>
                    </div>

                    {/* Signal Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {currentPromo.basedOnSignals.map((sig, idx) => (
                        <span key={idx} className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-850">
                          🎯 {sig}
                        </span>
                      ))}
                    </div>

                    {/* Price and Savings Box */}
                    <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-850 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <span className="block text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Perbandingan Harga</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-emerald-400 font-mono">
                            {formatRupiah(currentPromo.suggestedPrice)}
                          </span>
                          <span className="text-xs text-slate-500 line-through font-mono">
                            {formatRupiah(currentPromo.normalPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Potensi Hemat</span>
                        <span className="inline-block mt-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg">
                          Hemat {formatRupiah(currentPromo.estimatedSavings)}
                        </span>
                      </div>
                    </div>

                    {/* Target Parameters */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-950/45 p-3 rounded-2xl border border-slate-850/60 text-xs">
                      <div>
                        <span className="block text-[9px] font-mono text-slate-500 uppercase font-bold">Target Pelanggan</span>
                        <span className="text-slate-200 font-semibold block mt-0.5">{currentPromo.targetCustomer}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-mono text-slate-500 uppercase font-bold">Waktu Kampanye</span>
                        <span className="text-slate-200 font-semibold block mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-450" /> {currentPromo.targetTime}
                        </span>
                      </div>
                      <div className="col-span-2 border-t border-slate-900 pt-2 mt-1">
                        <span className="block text-[9px] font-mono text-slate-500 uppercase font-bold">Tujuan Kampanye</span>
                        <span className="text-slate-300 block mt-0.5 flex items-start gap-1 leading-normal">
                          <Target className="w-3.5 h-3.5 text-slate-550 mt-0.5 flex-shrink-0" />
                          <span>{currentPromo.campaignGoal}</span>
                        </span>
                      </div>
                    </div>

                    {/* Social Media Share Section */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Salin Caption Promosi</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => copyWA(currentPromo.whatsappCaption)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isCopiedWA ? (
                            <>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Caption WA Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy untuk WhatsApp</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => copyIG(currentPromo.instagramCaption)}
                          className="py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500 hover:text-white border border-purple-500/20 text-purple-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isCopiedIG ? (
                            <>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Caption IG Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy untuk Instagram</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Poster Preview Mockup */}
                    <div className="mt-2 space-y-3">
                      <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Preview Poster Digital</span>
                      
                      {/* Physical Poster Design Wrapper */}
                      <div className="relative overflow-hidden bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-6 items-center text-center aspect-[4/5] justify-between">
                        {/* Dynamic Neon Corner Accents */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full" />

                        {/* Brand header */}
                        <div className="w-full flex flex-col items-center border-b border-slate-900 pb-3">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-extrabold">UMKM PILOT MENU</span>
                          <h5 className="text-[9px] font-sans font-bold text-emerald-450 uppercase mt-0.5 tracking-wider">Smart Digital Ordering</h5>
                        </div>

                        {/* Main Body */}
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-emerald-500/10">
                            %
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white leading-tight uppercase tracking-wide">
                              {currentPromo.title}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                              {currentPromo.mainProductName} {currentPromo.bundleProductName !== 'Tidak Ada' && `+ ${currentPromo.bundleProductName}`}
                            </p>
                          </div>
                        </div>

                        {/* Price display and savings badge */}
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">HARGA SPESIAL</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white font-mono">{formatRupiah(currentPromo.suggestedPrice)}</span>
                            <span className="text-sm text-slate-500 line-through font-mono">{formatRupiah(currentPromo.normalPrice)}</span>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase mt-1">
                            Save {formatRupiah(currentPromo.estimatedSavings)}
                          </span>
                        </div>

                        {/* Footer QR simulation */}
                        <div className="w-full flex items-center justify-between border-t border-slate-900 pt-3.5">
                          <div className="text-left">
                            <span className="block text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider">Cara Pesan</span>
                            <span className="text-[9px] text-slate-350 block mt-0.5 font-sans leading-none">Scan QR di Meja</span>
                          </div>
                          {/* Mock QR Code Graphic */}
                          <div className="w-8 h-8 bg-white p-1 rounded-md flex flex-col gap-0.5 flex-shrink-0">
                            <div className="flex justify-between gap-0.5 flex-1">
                              <div className="w-2 bg-slate-950 rounded-[1px]" />
                              <div className="w-1 bg-slate-950 rounded-[1px]" />
                              <div className="w-2 bg-slate-950 rounded-[1px]" />
                            </div>
                            <div className="flex justify-between gap-0.5 flex-1 mt-0.5">
                              <div className="w-1 bg-slate-950 rounded-[1px]" />
                              <div className="w-2 bg-slate-950 rounded-[1px]" />
                              <div className="w-1 bg-slate-950 rounded-[1px]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Poster Controls */}
                      <div className="grid grid-cols-2 gap-2 mt-2.5">
                        <button
                          onClick={handleDownloadPoster}
                          disabled={isDownloading}
                          className="py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {downloadSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                              <span className="text-emerald-400">Poster Diunduh</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>{isDownloading ? 'Mengunduh...' : 'Unduh Poster'}</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handlePrintPoster}
                          disabled={isPrinting}
                          className="py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {printSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                              <span className="text-emerald-400">Poster Dicetak</span>
                            </>
                          ) : (
                            <>
                              <Printer className="w-3.5 h-3.5" />
                              <span>{isPrinting ? 'Mencetak...' : 'Cetak Poster'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-850 rounded-2xl">
          <p className="text-slate-500 text-xs">Sedang menyiapkan analisis data...</p>
        </div>
      )}
    </div>
  );
}
