'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Sparkles, 
  Send, 
  Copy, 
  Lightbulb, 
  TrendingUp, 
  HelpCircle,
  Check
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
  const [isCopied, setIsCopied] = useState(false);
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
      setInsight(insightService.generateInsights(o, p));
    };
    loadData();
  }, []);

  // Copy Promo Caption
  const copyPromoCaption = () => {
    if (!insight) return;
    navigator.clipboard.writeText(insight.suggestedPromo.caption);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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

          {/* Right Column: Suggested Promo Details */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col justify-between gap-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Rekomendasi Kampanye Promo</span>
              </h3>

              {/* Promo Banner Preview */}
              <div className="bg-gradient-to-tr from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <span className="text-[9px] font-mono text-emerald-400 font-extrabold uppercase border border-emerald-500/20 px-2 py-0.5 rounded-full bg-emerald-950/20">
                  AI SUGGESTION
                </span>
                <h4 className="font-extrabold text-white text-sm mt-3">{insight.suggestedPromo.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {insight.suggestedPromo.description}
                </p>
              </div>

              {/* Social Caption */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Materi Salin Caption (IG/WA)</span>
                  <button
                    onClick={copyPromoCaption}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-850 transition-all"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Preformatted caption display */}
                <pre className="w-full bg-slate-950/70 p-4 rounded-xl border border-slate-900 font-sans text-xs text-slate-350 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {insight.suggestedPromo.caption}
                </pre>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-450 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-450 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">
                Pasangkan materi caption di atas dengan foto produk bundling kombo terbaik Anda dan sebarkan di grup WhatsApp komunitas pelanggan Anda!
              </p>
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
