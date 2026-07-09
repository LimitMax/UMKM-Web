'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Brain,
  Check,
  ClipboardCheck,
  Copy,
  Loader2,
  Megaphone,
  MessageSquare,
  Package,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { insightService } from '../../../services/insightService';
import { orderService } from '../../../services/orderService';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';
import { AIInsight, GeneratedBusinessInsight, GeneratedPromoRecommendation, Order, PromoRecommendation } from '../../../types';
import { formatRupiah } from '../../../utils/format';

type CaptionTab = 'whatsapp' | 'instagram' | 'short';
type RangeKey = 'today' | '7d' | '30d';

interface OwnerChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedActions?: string[];
  source?: 'llm' | 'fallback';
  generatedAt?: string;
}

interface AiStatus {
  configured: boolean;
  baseUrlConfigured: boolean;
  modelConfigured: boolean;
  model: string;
  timeoutMs: number;
}

interface KpiSummary {
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

const fallbackMessage = 'LLM gagal digunakan. Insight fallback rule-based ditampilkan.';

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
];

const suggestedQuestions = [
  'Produk apa yang paling laku?',
  'Promo apa yang cocok hari ini?',
  'Stok apa yang perlu restock?',
  'Kenapa omzet turun?',
  'Bagaimana performa delivery?',
  'Apa action plan hari ini?',
];

function mapLegacyPromo(promo: PromoRecommendation): GeneratedPromoRecommendation {
  return {
    title: promo.title,
    suggestedPromoName: promo.suggestedPromoName,
    campaignGoal: promo.campaignGoal,
    mainProductName: promo.mainProductName,
    bundleProductName: promo.bundleProductName,
    reason: promo.reason,
    normalPrice: promo.normalPrice,
    suggestedPrice: promo.suggestedPrice,
    estimatedSavings: promo.estimatedSavings,
    targetTime: promo.targetTime,
    targetCustomer: promo.targetCustomer,
    confidenceScore: promo.confidenceScore,
    basedOnSignals: promo.basedOnSignals,
    whatsappCaption: promo.whatsappCaption,
    instagramCaption: promo.instagramCaption,
    shortCaption: promo.shortCaption,
    checklist: [
      'Pastikan stok produk promo aman.',
      'Publikasikan caption di kanal utama.',
      'Evaluasi performa promo setelah 3 hari.',
    ],
    generatedAt: new Date().toISOString(),
    source: 'rule_based',
  };
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function buildDateRange(range: RangeKey) {
  const now = new Date();
  const from = new Date(now);

  if (range === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (range === '7d') {
    from.setDate(now.getDate() - 7);
  } else {
    from.setDate(now.getDate() - 30);
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

function getKpis(orders: Order[], range: RangeKey): KpiSummary {
  const dateRange = buildDateRange(range);
  const filtered = orders.filter((order) => {
    const createdAt = new Date(order.createdAt).getTime();
    return createdAt >= new Date(dateRange.from).getTime() && createdAt <= new Date(dateRange.to).getTime();
  });
  const paidOrders = filtered.filter((order) => order.paymentStatus === 'Paid' || order.status === 'Completed');
  const revenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return {
    revenue,
    orders: paidOrders.length,
    averageOrderValue: paidOrders.length > 0 ? revenue / paidOrders.length : 0,
  };
}

function getStatusMeta(aiStatus: AiStatus | null, insight?: GeneratedBusinessInsight | null, promo?: GeneratedPromoRecommendation | null) {
  const latestFallbackReason = insight?.fallbackReason || promo?.fallbackReason;
  const hasLlmResult = insight?.source === 'llm' || promo?.source === 'llm';

  if (!aiStatus?.configured) {
    return { label: 'Belum Dikonfigurasi', className: 'border-slate-700 bg-slate-800/70 text-slate-300' };
  }
  if (latestFallbackReason === 'timeout') {
    return { label: 'LLM Timeout', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' };
  }
  if (hasLlmResult) {
    return { label: 'AI Aktif', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' };
  }
  return { label: 'Mode Rule-Based', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' };
}

function getPriorityClass(priority: string) {
  if (priority === 'high') return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  if (priority === 'medium') return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  return 'border-slate-700 bg-slate-800 text-slate-300';
}

export default function AdminInsightsPage() {
  const { profile, role } = useAuth();
  const [legacyInsight, setLegacyInsight] = useState<AIInsight | null>(null);
  const [businessInsight, setBusinessInsight] = useState<GeneratedBusinessInsight | null>(null);
  const [promo, setPromo] = useState<GeneratedPromoRecommendation | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [captionTab, setCaptionTab] = useState<CaptionTab>('whatsapp');
  const [copiedCaption, setCopiedCaption] = useState<CaptionTab | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [range, setRange] = useState<RangeKey>('7d');
  const [chatMessages, setChatMessages] = useState<OwnerChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastChatSentAt, setLastChatSentAt] = useState(0);

  const isAdmin = role === 'admin';
  const businessId = profile?.business_id;
  const lastGeneratedAt = businessInsight?.generatedAt || promo?.generatedAt;
  const statusMeta = getStatusMeta(aiStatus, businessInsight, promo);
  const kpis = useMemo(() => getKpis(orders, range), [orders, range]);
  const isGenerating = generatingInsight || generatingPromo;
  const sourceLabel = businessInsight?.source === 'llm' || promo?.source === 'llm' ? 'LLM' : 'Rule-Based';
  const activeCaption = useMemo(() => {
    if (!promo) return '';
    if (captionTab === 'whatsapp') return promo.whatsappCaption;
    if (captionTab === 'instagram') return promo.instagramCaption;
    return promo.shortCaption;
  }, [captionTab, promo]);

  useEffect(() => {
    const loadAiStatus = async () => {
      try {
        const response = await fetch('/api/ai/status');
        if (!response.ok) return;
        setAiStatus((await response.json()) as AiStatus);
      } catch (error) {
        console.error('Failed to load AI status:', error);
      }
    };

    loadAiStatus();
  }, []);

  useEffect(() => {
    const loadRuleBasedInsight = async () => {
      if (!businessId || !isAdmin) {
        setLoadingBase(false);
        return;
      }

      setLoadingBase(true);
      setErrorMessage('');
      try {
        const [loadedOrders, products] = await Promise.all([
          orderService.getOrdersByBusinessId(businessId),
          productService.getProducts('supabase', businessId),
        ]);
        const ruleBased = insightService.generateInsights(loadedOrders, products);
        setOrders(loadedOrders);
        setLegacyInsight(ruleBased);

        if (ruleBased.promoRecommendations?.[0]) {
          setPromo(mapLegacyPromo(ruleBased.promoRecommendations[0]));
        }
      } catch (error) {
        console.error('Failed to load rule-based insights:', error);
        setErrorMessage('Gagal memuat data insight. Coba refresh halaman.');
      } finally {
        setLoadingBase(false);
      }
    };

    loadRuleBasedInsight();
  }, [businessId, isAdmin]);

  useEffect(() => {
    if (!businessId) return;
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(`umkm_ai_chat_${businessId}`);
        if (saved) {
          setChatMessages(JSON.parse(saved) as OwnerChatMessage[]);
        }
      } catch (error) {
        console.error('Failed to restore AI chat session:', error);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    try {
      window.sessionStorage.setItem(`umkm_ai_chat_${businessId}`, JSON.stringify(chatMessages.slice(-20)));
    } catch (error) {
      console.error('Failed to persist AI chat session:', error);
    }
  }, [businessId, chatMessages]);

  const getAccessToken = async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token || '';
  };

  const generateBusinessInsight = async () => {
    if (!businessId) return;
    setGeneratingInsight(true);
    setErrorMessage('');

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/ai/business-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId, dateRange: buildDateRange(range) }),
      });

      if (!response.ok) throw new Error('Request failed');
      const nextInsight = (await response.json()) as GeneratedBusinessInsight;
      setBusinessInsight(nextInsight);
      if (nextInsight.source === 'rule_based') {
        setErrorMessage(nextInsight.fallbackMessage || fallbackMessage);
      }
    } catch (error) {
      console.error('Generate business insight failed:', error);
      setErrorMessage('Insight AI belum bisa dibuat. Rekomendasi rule-based tetap tersedia.');
    } finally {
      setGeneratingInsight(false);
    }
  };

  const generatePromo = async () => {
    if (!businessId) return;
    setGeneratingPromo(true);
    setErrorMessage('');

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/ai/promo-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId, dateRange: buildDateRange(range) }),
      });

      if (!response.ok) throw new Error('Request failed');
      const nextPromo = (await response.json()) as GeneratedPromoRecommendation;
      setPromo(nextPromo);
      if (nextPromo.source === 'rule_based') {
        setErrorMessage(nextPromo.fallbackMessage || 'Rekomendasi promo fallback rule-based ditampilkan.');
      }
    } catch (error) {
      console.error('Generate promo failed:', error);
      setErrorMessage('Rekomendasi promo AI belum bisa dibuat. Promo rule-based tetap tersedia.');
    } finally {
      setGeneratingPromo(false);
    }
  };

  const copyCaption = async () => {
    if (!activeCaption) return;
    await navigator.clipboard.writeText(activeCaption);
    setCopiedCaption(captionTab);
    setTimeout(() => setCopiedCaption(null), 1800);
  };

  const sendChatMessage = async (forcedMessage?: string) => {
    if (!businessId || chatLoading) return;
    const message = (forcedMessage || chatInput).trim().slice(0, 500);
    if (!message) return;

    const now = Date.now();
    if (now - lastChatSentAt < 3500) {
      setChatError('Tunggu sebentar sebelum mengirim pertanyaan berikutnya.');
      return;
    }

    setLastChatSentAt(now);
    setChatLoading(true);
    setChatError('');
    setChatInput('');

    const userMessage: OwnerChatMessage = { role: 'user', content: message };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          message,
          dateRange: range,
          conversationHistory: nextMessages.slice(-6).map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal memproses chat AI.');
      }

      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || 'Saya belum bisa menjawab pertanyaan itu.',
          suggestedActions: Array.isArray(data.suggestedActions) ? data.suggestedActions : [],
          source: data.source || 'fallback',
          generatedAt: data.generatedAt,
        },
      ]);
    } catch (error) {
      console.error('AI chat failed:', error);
      setChatError(error instanceof Error ? error.message : 'Gagal memproses chat AI.');
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'AI belum bisa menjawab saat ini. Coba gunakan pertanyaan yang lebih spesifik atau rentang data lebih kecil.',
          suggestedActions: ['Gunakan rentang Hari Ini.', 'Tanyakan satu topik seperti stok, promo, atau delivery.'],
          source: 'fallback',
          generatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatError('');
    if (businessId) {
      window.sessionStorage.removeItem(`umkm_ai_chat_${businessId}`);
    }
  };

  if (!isAdmin) {
    return <AccessWarning />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader aiStatus={aiStatus} statusMeta={statusMeta} lastGeneratedAt={lastGeneratedAt} />

      <AIControlPanel
        aiStatus={aiStatus}
        range={range}
        setRange={setRange}
        sourceLabel={sourceLabel}
        lastGeneratedAt={lastGeneratedAt}
        isGenerating={isGenerating}
        generatingInsight={generatingInsight}
        generatingPromo={generatingPromo}
        onGenerateInsight={generateBusinessInsight}
        onGeneratePromo={generatePromo}
      />

      {errorMessage && <FallbackBanner message={errorMessage} />}

      {loadingBase ? (
        <LoadingInsightCard />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="flex min-w-0 flex-col gap-5">
            <ExecutiveSummaryCard
              insight={businessInsight}
              legacyInsight={legacyInsight}
              kpis={kpis}
              aiConfigured={Boolean(aiStatus?.configured)}
            />

            {businessInsight ? (
              <InsightGrid insight={businessInsight} />
            ) : (
              <EmptyInsightState />
            )}
          </main>

          <PromoRecommendationPanel
            promo={promo}
            captionTab={captionTab}
            setCaptionTab={setCaptionTab}
            activeCaption={activeCaption}
            copiedCaption={copiedCaption}
            copyCaption={copyCaption}
          />
        </div>
      )}

      <OwnerChatAssistant
        messages={chatMessages}
        input={chatInput}
        setInput={setChatInput}
        loading={chatLoading}
        error={chatError}
        range={range}
        setRange={setRange}
        onSend={sendChatMessage}
        onClear={clearChat}
      />
    </div>
  );
}

function PageHeader({
  aiStatus,
  statusMeta,
  lastGeneratedAt,
}: {
  aiStatus: AiStatus | null;
  statusMeta: { label: string; className: string };
  lastGeneratedAt?: string;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-white">
          <Brain className="h-6 w-6 text-emerald-400" />
          <span>AI Business Insights</span>
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
          Analisis bisnis, rekomendasi promo, stok, delivery, dan ETA berbasis data transaksi.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TinyBadge label={`Model: ${aiStatus?.model || '-'}`} />
        <TinyBadge label={statusMeta.label} className={statusMeta.className} />
        <TinyBadge label={`Terakhir: ${formatDateTime(lastGeneratedAt)}`} />
      </div>
    </header>
  );
}

function AIControlPanel({
  aiStatus,
  range,
  setRange,
  sourceLabel,
  lastGeneratedAt,
  isGenerating,
  generatingInsight,
  generatingPromo,
  onGenerateInsight,
  onGeneratePromo,
}: {
  aiStatus: AiStatus | null;
  range: RangeKey;
  setRange: (range: RangeKey) => void;
  sourceLabel: string;
  lastGeneratedAt?: string;
  isGenerating: boolean;
  generatingInsight: boolean;
  generatingPromo: boolean;
  onGenerateInsight: () => void;
  onGeneratePromo: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-850 bg-slate-900/80 p-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-center">
        <div className="grid grid-cols-3 gap-2">
          <ControlMetric label="Status AI" value={aiStatus?.configured ? 'Terkonfigurasi' : 'Belum siap'} />
          <ControlMetric label="Terakhir generate" value={formatDateTime(lastGeneratedAt)} />
          <ControlMetric label="Sumber insight" value={sourceLabel} />
        </div>

        <div className="flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {rangeOptions.map((item) => (
            <button
              key={item.key}
              onClick={() => setRange(item.key)}
              className={`rounded-lg px-3 py-2 text-[11px] font-black transition-all ${
                range === item.key ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[360px]">
          <button
            onClick={onGenerateInsight}
            disabled={generatingInsight}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Generate Insight AI</span>
          </button>
          <button
            onClick={onGeneratePromo}
            disabled={generatingPromo}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs font-black text-emerald-400 transition-all hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            <span>Generate Promo AI</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-slate-850 pt-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>LLM hanya dipanggil saat tombol generate ditekan untuk mengontrol biaya.</span>
        {isGenerating && (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            AI sedang menganalisis data...
          </span>
        )}
      </div>
    </section>
  );
}

function ExecutiveSummaryCard({
  insight,
  legacyInsight,
  kpis,
  aiConfigured,
}: {
  insight: GeneratedBusinessInsight | null;
  legacyInsight: AIInsight | null;
  kpis: KpiSummary;
  aiConfigured: boolean;
}) {
  const summary = insight?.executiveSummary || legacyInsight?.summary || 'Belum ada insight AI. Klik Generate Insight AI untuk mulai analisis.';

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wide text-emerald-400">Ringkasan Eksekutif</span>
          <h2 className="mt-1 text-lg font-black text-white">Snapshot performa bisnis</h2>
        </div>
        {insight?.source === 'rule_based' && (
          <span className="w-fit rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
            Fallback Rule-Based
          </span>
        )}
      </div>

      <p className="max-w-4xl text-sm leading-relaxed text-slate-300">{summary}</p>

      {!insight && aiConfigured && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/35 p-4 text-xs text-slate-400">
          Belum ada insight AI. Klik Generate Insight AI untuk mulai analisis.
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiChip label="Total Revenue" value={formatRupiah(kpis.revenue)} />
        <KpiChip label="Total Orders" value={`${kpis.orders} order`} />
        <KpiChip label="Average Order Value" value={formatRupiah(kpis.averageOrderValue)} />
      </div>
    </section>
  );
}

function InsightGrid({ insight }: { insight: GeneratedBusinessInsight }) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <InsightCategoryCard title="Highlight Penjualan" icon={<Zap className="h-4 w-4" />} items={insight.salesHighlights} empty="Belum ada highlight penjualan." />
      <InsightCategoryCard title="Risiko Bisnis" icon={<AlertTriangle className="h-4 w-4" />} items={insight.riskAlerts} empty="Tidak ada risiko utama." />
      <InsightCategoryCard title="Produk" icon={<Award className="h-4 w-4" />} items={insight.productInsights} empty="Belum ada insight produk." />
      <InsightCategoryCard title="Stok" icon={<ClipboardCheck className="h-4 w-4" />} items={insight.stockRecommendations} empty="Tidak ada rekomendasi stok." />
      <InsightCategoryCard
        title="Delivery & ETA"
        icon={<RefreshCw className="h-4 w-4" />}
        items={[...insight.deliveryInsights, ...insight.etaInsights].slice(0, 5)}
        empty="Belum ada data delivery atau ETA."
      />
      <ActionPlanCard actionPlan={insight.actionPlan} />
    </section>
  );
}

function PromoRecommendationPanel({
  promo,
  captionTab,
  setCaptionTab,
  activeCaption,
  copiedCaption,
  copyCaption,
}: {
  promo: GeneratedPromoRecommendation | null;
  captionTab: CaptionTab;
  setCaptionTab: (tab: CaptionTab) => void;
  activeCaption: string;
  copiedCaption: CaptionTab | null;
  copyCaption: () => void;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-slate-850 bg-slate-900 p-5 xl:sticky xl:top-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-white">
            <Megaphone className="h-4 w-4 text-emerald-400" />
            <span>Rekomendasi Kampanye Promo</span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Promo actionable berbasis pola transaksi.</p>
        </div>
        {promo?.source === 'rule_based' && (
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">
            Rule-Based
          </span>
        )}
      </div>

      {promo ? (
        <div className="flex flex-col gap-5">
          <section>
            <h3 className="text-base font-black leading-tight text-white">{promo.suggestedPromoName}</h3>
            <p className="mt-1 text-xs font-semibold text-emerald-400">{promo.title}</p>
          </section>

          <PromoSection title="Kenapa Promo Ini?">
            <p className="text-xs leading-relaxed text-slate-300">{promo.reason}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {promo.basedOnSignals.slice(0, 3).map((signal, index) => (
                <span key={`${signal}-${index}`} className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-400">
                  {signal}
                </span>
              ))}
            </div>
          </PromoSection>

          <PromoSection title="Paket Rekomendasi">
            <div className="grid grid-cols-2 gap-3">
              <PromoMetric label="Produk Utama" value={promo.mainProductName} />
              <PromoMetric label="Bundle" value={promo.bundleProductName || 'Tidak Ada'} />
              <PromoMetric label="Harga Normal" value={formatRupiah(promo.normalPrice)} mono />
              <PromoMetric label="Harga Promo" value={formatRupiah(promo.suggestedPrice)} mono highlight />
              <PromoMetric label="Estimasi Hemat" value={formatRupiah(promo.estimatedSavings)} mono />
              <PromoMetric label="Confidence" value={`${promo.confidenceScore}%`} highlight />
            </div>
          </PromoSection>

          <PromoSection title="Target Campaign">
            <div className="flex flex-col gap-3">
              <PromoMetric label="Goal" value={promo.campaignGoal} />
              <PromoMetric label="Target Pelanggan" value={promo.targetCustomer} />
              <PromoMetric label="Waktu Terbaik" value={promo.targetTime} />
            </div>
          </PromoSection>

          <PromoSection title="Caption">
            <div className="mb-3 flex rounded-xl bg-slate-950 p-1">
              {[
                ['whatsapp', 'WhatsApp'],
                ['instagram', 'Instagram'],
                ['short', 'Singkat'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCaptionTab(key as CaptionTab)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-black transition-all ${
                    captionTab === key ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="min-h-24 whitespace-pre-line rounded-xl bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-300">{activeCaption}</p>
            <button
              onClick={copyCaption}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500 hover:text-slate-950"
            >
              {copiedCaption === captionTab ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedCaption === captionTab ? 'Caption Tersalin' : 'Copy Caption'}</span>
            </button>
          </PromoSection>

          <PromoSection title="Checklist Campaign">
            <InsightRows items={promo.checklist} empty="Belum ada checklist." />
          </PromoSection>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center">
          <Package className="mx-auto mb-3 h-7 w-7 text-slate-600" />
          <p className="text-xs leading-relaxed text-slate-500">Belum ada rekomendasi promo. Klik Generate Promo AI untuk membuat kampanye.</p>
        </div>
      )}
    </aside>
  );
}

function OwnerChatAssistant({
  messages,
  input,
  setInput,
  loading,
  error,
  range,
  setRange,
  onSend,
  onClear,
}: {
  messages: OwnerChatMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  error: string;
  range: RangeKey;
  setRange: (range: RangeKey) => void;
  onSend: (message?: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-850 bg-slate-900 p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-white">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <span>Tanya AI Pilot</span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Tanyakan penjualan, produk, stok, delivery, ETA, laporan, atau ide promo berbasis data Supabase.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            {rangeOptions.map((item) => (
              <button
                key={`chat-${item.key}`}
                onClick={() => setRange(item.key)}
                className={`rounded-lg px-3 py-2 text-[11px] font-black transition-all ${
                  range === item.key ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClear}
            disabled={messages.length === 0 || loading}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] font-bold text-slate-400 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hapus Riwayat Chat
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {suggestedQuestions.map((question) => (
          <button
            key={question}
            onClick={() => onSend(question)}
            disabled={loading}
            className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition-all hover:border-emerald-500/25 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="flex h-[480px] flex-col rounded-2xl bg-slate-950/45">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Brain className="mb-3 h-9 w-9 text-slate-700" />
              <h3 className="text-sm font-black text-white">Mulai percakapan bisnis</h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                Klik salah satu pertanyaan cepat atau tulis pertanyaan sendiri. AI tidak dipanggil sebelum Anda mengirim pesan.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message, index) => (
                <ChatBubble key={`${message.role}-${index}-${message.generatedAt || ''}`} message={message} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-2 font-bold text-emerald-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      AI sedang menganalisis data...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-850 p-3">
          {error && <p className="mb-2 text-[11px] font-semibold text-amber-300">{error}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSend();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="flex-1">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 500))}
                maxLength={500}
                disabled={loading}
                placeholder="Tanya: produk terlaris, stok restock, promo, delivery, ETA..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500 disabled:opacity-60"
              />
              <div className="mt-1 text-right text-[10px] text-slate-600">{input.length}/500</div>
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 sm:self-start"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: OwnerChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[86%] rounded-2xl p-3 text-xs leading-relaxed ${
          isUser
            ? 'rounded-tr-md bg-emerald-500 text-slate-950'
            : 'rounded-tl-md border border-slate-800 bg-slate-900 text-slate-300'
        }`}
      >
        {!isUser && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${message.source === 'llm' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'}`}>
              {message.source === 'llm' ? 'AI' : 'Fallback'}
            </span>
            {message.generatedAt && <span className="text-[10px] text-slate-600">{formatDateTime(message.generatedAt)}</span>}
          </div>
        )}
        <p className="whitespace-pre-line">{message.content}</p>
        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">Aksi Disarankan</span>
            <ul className="space-y-1.5">
              {message.suggestedActions.slice(0, 3).map((action, index) => (
                <li key={`${action}-${index}`} className="flex gap-2 text-slate-300">
                  <span className="text-emerald-400">{index + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function AccessWarning() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-white">
          <Brain className="h-6 w-6 text-emerald-400" />
          <span>AI Business Insights</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">Insight bisnis hanya tersedia untuk akun admin.</p>
      </div>
      <div className="glass rounded-2xl border border-amber-500/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
          <div>
            <h2 className="text-sm font-bold text-white">Akses dibatasi</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Cashier tidak dapat membuat business insights. Gunakan akun admin untuk mengakses fitur AI ini.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FallbackBanner({ message }: { message: string }) {
  const timeoutHint = message.toLowerCase().includes('terlalu lama')
    ? ' Coba gunakan rentang data lebih kecil.'
    : '';

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
      {message}
      {timeoutHint}
    </div>
  );
}

function LoadingInsightCard() {
  return (
    <div className="rounded-3xl border border-slate-850 bg-slate-900 p-6">
      <div className="mb-5 h-4 w-40 animate-pulse rounded bg-slate-800" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-slate-850" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-850" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-850" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-950/60" />
        ))}
      </div>
    </div>
  );
}

function EmptyInsightState() {
  return (
    <section className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
      <Brain className="mx-auto mb-3 h-8 w-8 text-slate-600" />
      <h3 className="text-sm font-black text-white">Belum ada insight AI</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">Klik Generate Insight AI untuk mulai analisis. Hasil rule-based tetap tersedia sebagai ringkasan awal.</p>
    </section>
  );
}

function ControlMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950/55 px-3 py-2">
      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-0.5 block truncate text-xs font-bold text-slate-200">{value}</span>
    </div>
  );
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-4">
      <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-1 block text-lg font-black text-white">{value}</span>
    </div>
  );
}

function TinyBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-slate-400 ${className || ''}`}>
      {label}
    </span>
  );
}

function InsightCategoryCard({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: string[]; empty: string }) {
  return (
    <article className="min-h-[210px] rounded-2xl border border-slate-850 bg-slate-900 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-white">
        <span className="text-emerald-400">{icon}</span>
        <span>{title}</span>
      </h3>
      <InsightRows items={items} empty={empty} />
    </article>
  );
}

function ActionPlanCard({ actionPlan }: { actionPlan: GeneratedBusinessInsight['actionPlan'] }) {
  return (
    <article className="min-h-[210px] rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-white">
        <Target className="h-4 w-4 text-emerald-400" />
        <span>Action Plan</span>
      </h3>
      <div className="flex flex-col gap-2">
        {(actionPlan.length > 0 ? actionPlan : [{ priority: 'medium' as const, action: 'Belum ada action plan.' }]).slice(0, 5).map((item, index) => (
          <div key={`${item.action}-${index}`} className="rounded-xl bg-slate-950/55 p-3">
            <span className={`mb-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black ${getPriorityClass(item.priority)}`}>
              {item.priority.toUpperCase()}
            </span>
            <p className="text-xs leading-relaxed text-slate-300">{item.action}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function InsightRows({ items, empty }: { items: string[]; empty: string }) {
  const visibleItems = items.length > 0 ? items : [empty];
  return (
    <div className="flex flex-col gap-2">
      {visibleItems.slice(0, 5).map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-xl bg-slate-950/45 p-3">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-slate-800 text-[10px] font-black text-emerald-400">
            {index + 1}
          </span>
          <p className="text-xs leading-relaxed text-slate-300">{item}</p>
        </div>
      ))}
    </div>
  );
}

function PromoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-850 pt-4">
      <h4 className="mb-3 text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </section>
  );
}

function PromoMetric({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`mt-0.5 block text-xs font-bold leading-relaxed ${mono ? 'font-mono' : ''} ${highlight ? 'text-emerald-400' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}
