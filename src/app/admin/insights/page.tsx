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
  Package,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { orderService } from '../../../services/orderService';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';
import { GeneratedBusinessInsight, GeneratedPromoRecommendation, Order } from '../../../types';
import { formatRupiah } from '../../../utils/format';
import { FloatingAIChatAssistant } from '../../../components/ai/FloatingAIChatAssistant';
import { AI_DATE_RANGE_LABELS, AiDateRangeKey, buildAiDateRange } from '../../../lib/ai/dateRange';
import UpgradeAlertModal from '../../../components/payments/UpgradeAlertModal';

type CaptionTab = 'whatsapp' | 'instagram' | 'short';
type RangeKey = AiDateRangeKey;

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
  { key: 'today', label: AI_DATE_RANGE_LABELS.today },
  { key: '7d', label: AI_DATE_RANGE_LABELS['7d'] },
  { key: '30d', label: AI_DATE_RANGE_LABELS['30d'] },
];

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function buildDateRange(range: RangeKey) {
  return buildAiDateRange(range);
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
    return { label: 'LLM belum dikonfigurasi', className: 'border-slate-700 bg-slate-800/70 text-slate-300' };
  }
  if (latestFallbackReason === 'timeout') {
    return { label: 'LLM Timeout', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' };
  }
  if (hasLlmResult) {
    return { label: 'AI Aktif', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' };
  }
  return { label: 'AI siap digunakan', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' };
}

function getPriorityClass(priority: string) {
  if (priority === 'high') return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  if (priority === 'medium') return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  return 'border-slate-700 bg-slate-800 text-slate-300';
}

export default function AdminInsightsPage() {
  const { profile, role } = useAuth();
  const [businessInsight, setBusinessInsight] = useState<GeneratedBusinessInsight | null>(null);
  const [promo, setPromo] = useState<GeneratedPromoRecommendation | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [businessInsightLoading, setBusinessInsightLoading] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [hasGeneratedBusinessInsight, setHasGeneratedBusinessInsight] = useState(false);
  const [hasGeneratedPromoRecommendation, setHasGeneratedPromoRecommendation] = useState(false);
  const [businessInsightSource, setBusinessInsightSource] = useState<'llm' | 'rule_based' | null>(null);
  const [promoSource, setPromoSource] = useState<'llm' | 'rule_based' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [captionTab, setCaptionTab] = useState<CaptionTab>('whatsapp');
  const [copiedCaption, setCopiedCaption] = useState<CaptionTab | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [range, setRange] = useState<RangeKey>('7d');
  const [planCode, setPlanCode] = useState<string>('free');
  const [upgradeAlertOpen, setUpgradeAlertOpen] = useState(false);

  const businessId = profile?.business_id ?? undefined;

  const isDeveloperAccount = useMemo(() => {
    return profile?.role === 'platform_owner' || profile?.business_id === 'biz-platform-owner';
  }, [profile]);

  useEffect(() => {
    async function fetchPlan() {
      if (businessId) {
        try {
          const { data } = await supabaseClient
            .from('businesses')
            .select('plan_code')
            .eq('id', businessId)
            .maybeSingle();
          if (data?.plan_code) {
            setPlanCode(data.plan_code);
          }
        } catch (e) {
          console.error('Failed to fetch plan code for AI insights gating:', e);
        }
      }
    }
    fetchPlan();
  }, [businessId]);

  const isAdmin = role === 'admin';
  const lastGeneratedAt = businessInsight?.generatedAt || promo?.generatedAt;
  const statusMeta = getStatusMeta(aiStatus, businessInsight, promo);
  const kpis = useMemo(() => getKpis(orders, range), [orders, range]);
  const isGenerating = businessInsightLoading || promoLoading;
  const sourceLabel = businessInsightSource || promoSource
    ? [businessInsightSource, promoSource].filter(Boolean).map((item) => item === 'llm' ? 'LLM' : 'Rule-Based').join(' / ')
    : '-';
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
        const loadedOrders = await orderService.getOrdersByBusinessId(businessId);
        setOrders(loadedOrders);
      } catch (error) {
        console.error('Failed to load rule-based insights:', error);
        setErrorMessage('Gagal memuat data insight. Coba refresh halaman.');
      } finally {
        setLoadingBase(false);
      }
    };

    loadRuleBasedInsight();
  }, [businessId, isAdmin]);

  const getAccessToken = async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token || '';
  };

  const generateBusinessInsight = async () => {
    if (planCode !== 'pro' && !isDeveloperAccount) {
      setUpgradeAlertOpen(true);
      return;
    }
    if (!businessId) return;
    setBusinessInsightLoading(true);
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
      setHasGeneratedBusinessInsight(true);
      setBusinessInsightSource(nextInsight.source);
      if (nextInsight.source === 'rule_based') {
        setErrorMessage(nextInsight.fallbackMessage || fallbackMessage);
      }
    } catch (error) {
      console.error('Generate business insight failed:', error);
      setErrorMessage('Insight AI belum bisa dibuat. Rekomendasi rule-based tetap tersedia.');
    } finally {
      setBusinessInsightLoading(false);
    }
  };

  const generatePromo = async () => {
    if (planCode !== 'pro' && !isDeveloperAccount) {
      setUpgradeAlertOpen(true);
      return;
    }
    if (!businessId) return;
    setPromoLoading(true);
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
      setHasGeneratedPromoRecommendation(true);
      setPromoSource(nextPromo.source);
      if (nextPromo.source === 'rule_based') {
        setErrorMessage(nextPromo.fallbackMessage || 'Rekomendasi promo fallback rule-based ditampilkan.');
      }
    } catch (error) {
      console.error('Generate promo failed:', error);
      setErrorMessage('Rekomendasi promo AI belum bisa dibuat. Promo rule-based tetap tersedia.');
    } finally {
      setPromoLoading(false);
    }
  };

  const copyCaption = async () => {
    if (!activeCaption) return;
    await navigator.clipboard.writeText(activeCaption);
    setCopiedCaption(captionTab);
    setTimeout(() => setCopiedCaption(null), 1800);
  };

  if (!isAdmin) {
    return <AccessWarning />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader aiStatus={aiStatus} statusMeta={statusMeta} lastGeneratedAt={lastGeneratedAt} />

      {planCode !== 'pro' && (
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-350 leading-relaxed font-semibold flex items-center gap-2">
          <span>✨</span>
          <span>Fitur AI Insights tersedia di paket Pro. Akun Anda saat ini berada di paket {planCode === 'starter' ? 'Starter' : 'Free'}.</span>
        </div>
      )}

      <AIControlPanel
        aiStatus={aiStatus}
        range={range}
        setRange={setRange}
        rangeLabel={AI_DATE_RANGE_LABELS[range]}
        sourceLabel={sourceLabel}
        lastGeneratedAt={lastGeneratedAt}
        isGenerating={isGenerating}
        generatingInsight={businessInsightLoading}
        generatingPromo={promoLoading}
        hasGeneratedBusinessInsight={hasGeneratedBusinessInsight}
        hasGeneratedPromoRecommendation={hasGeneratedPromoRecommendation}
        businessInsightRange={businessInsight?.dateRange}
        promoRange={promo?.dateRange}
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
              kpis={kpis}
              aiConfigured={Boolean(aiStatus?.configured)}
              selectedRange={range}
              hasGenerated={hasGeneratedBusinessInsight}
              onGenerate={generateBusinessInsight}
            />

            {hasGeneratedBusinessInsight && businessInsight ? (
              <InsightGrid insight={businessInsight} />
            ) : (
              <EmptyInsightState onGenerate={generateBusinessInsight} loading={businessInsightLoading} />
            )}
          </main>

          <PromoRecommendationPanel
            promo={promo}
            hasGenerated={hasGeneratedPromoRecommendation}
            onGenerate={generatePromo}
            loading={promoLoading}
            selectedRange={range}
            captionTab={captionTab}
            setCaptionTab={setCaptionTab}
            activeCaption={activeCaption}
            copiedCaption={copiedCaption}
            copyCaption={copyCaption}
          />
        </div>
      )}

      <FloatingAIChatAssistant
        businessId={businessId}
        dateRange={range}
        dateRangeLabel={AI_DATE_RANGE_LABELS[range]}
        aiReady={Boolean(aiStatus?.configured)}
        planCode={planCode}
        isDeveloperAccount={isDeveloperAccount}
      />

      <UpgradeAlertModal
        isOpen={upgradeAlertOpen}
        onClose={() => setUpgradeAlertOpen(false)}
        featureName="Analisis & Asisten AI"
        description="Fitur AI Business Insights dan Promo hanya tersedia pada paket Pro. Silakan upgrade paket Anda untuk mendapatkan analisis premium."
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
  rangeLabel,
  sourceLabel,
  lastGeneratedAt,
  isGenerating,
  generatingInsight,
  generatingPromo,
  hasGeneratedBusinessInsight,
  hasGeneratedPromoRecommendation,
  businessInsightRange,
  promoRange,
  onGenerateInsight,
  onGeneratePromo,
}: {
  aiStatus: AiStatus | null;
  range: RangeKey;
  setRange: (range: RangeKey) => void;
  rangeLabel: string;
  sourceLabel: string;
  lastGeneratedAt?: string;
  isGenerating: boolean;
  generatingInsight: boolean;
  generatingPromo: boolean;
  hasGeneratedBusinessInsight: boolean;
  hasGeneratedPromoRecommendation: boolean;
  businessInsightRange?: string;
  promoRange?: string;
  onGenerateInsight: () => void;
  onGeneratePromo: () => void;
}) {
  const hasGeneratedAny = hasGeneratedBusinessInsight || hasGeneratedPromoRecommendation;
  const hasStaleResult = Boolean(
    (businessInsightRange && businessInsightRange !== range) ||
    (promoRange && promoRange !== range)
  );

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
        <span>Analisis berdasarkan: <strong className="text-slate-300">{rangeLabel}</strong>. Insight, promo, dan chat AI menggunakan rentang waktu yang dipilih.</span>
        {isGenerating && (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            AI sedang menganalisis data...
          </span>
        )}
      </div>
      {hasGeneratedAny && hasStaleResult && (
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
          Rentang waktu berubah. Klik Generate untuk memperbarui hasil.
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-600">LLM hanya dipanggil saat tombol generate atau chat dikirim untuk mengontrol biaya.</p>
    </section>
  );
}

function ExecutiveSummaryCard({
  insight,
  kpis,
  aiConfigured,
  selectedRange,
  hasGenerated,
  onGenerate,
}: {
  insight: GeneratedBusinessInsight | null;
  kpis: KpiSummary;
  aiConfigured: boolean;
  selectedRange: RangeKey;
  hasGenerated: boolean;
  onGenerate: () => void;
}) {
  const summary = insight?.executiveSummary || 'Pilih rentang waktu, lalu klik Generate Insight AI untuk mulai menganalisis performa bisnis.';
  const stale = Boolean(insight?.dateRange && insight.dateRange !== selectedRange);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wide text-emerald-400">Ringkasan Eksekutif</span>
          <h2 className="mt-1 text-lg font-black text-white">Snapshot performa bisnis</h2>
        </div>
        {insight?.source && (
          <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold ${
            insight.source === 'llm'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
          }`}>
            {insight.source === 'llm' ? 'Insight AI Aktif' : 'Fallback Rule-Based'}
          </span>
        )}
        {insight?.dateRangeLabel && (
          <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold ${stale ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950 text-slate-400'}`}>
            Insight terakhir dibuat untuk: {insight.dateRangeLabel}
          </span>
        )}
      </div>

      {hasGenerated ? (
        <p className="max-w-4xl text-sm leading-relaxed text-slate-300">{summary}</p>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/35 p-4">
          <h3 className="text-sm font-black text-white">Belum ada insight AI</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Pilih rentang waktu, lalu klik Generate Insight AI untuk mulai menganalisis performa bisnis.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Highlight penjualan', 'Risiko bisnis', 'Rekomendasi stok', 'Action plan'].map((item) => (
              <span key={item} className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                {item}
              </span>
            ))}
          </div>
          {aiConfigured && (
            <button
              onClick={onGenerate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-emerald-400"
            >
              <Sparkles className="h-4 w-4" />
              Generate Insight AI
            </button>
          )}
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
  hasGenerated,
  onGenerate,
  loading,
  selectedRange,
  captionTab,
  setCaptionTab,
  activeCaption,
  copiedCaption,
  copyCaption,
}: {
  promo: GeneratedPromoRecommendation | null;
  hasGenerated: boolean;
  onGenerate: () => void;
  loading: boolean;
  selectedRange: RangeKey;
  captionTab: CaptionTab;
  setCaptionTab: (tab: CaptionTab) => void;
  activeCaption: string;
  copiedCaption: CaptionTab | null;
  copyCaption: () => void;
}) {
  const stale = Boolean(promo?.dateRange && promo.dateRange !== selectedRange);

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
        {hasGenerated && promo?.source && (
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
            promo.source === 'llm'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
          }`}>
            {promo.source === 'llm' ? 'LLM' : 'Fallback Rule-Based'}
          </span>
        )}
      </div>

      {hasGenerated && promo ? (
        <div className="flex flex-col gap-5">
          <section>
            <h3 className="text-base font-black leading-tight text-white">{promo.suggestedPromoName}</h3>
            <p className="mt-1 text-xs font-semibold text-emerald-400">{promo.title}</p>
            {promo.dateRangeLabel && (
              <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${stale ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950 text-slate-400'}`}>
                Promo terakhir dibuat untuk: {promo.dateRangeLabel}
              </span>
            )}
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
          <h3 className="text-sm font-black text-white">Belum ada rekomendasi promo</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Klik Generate Promo AI untuk membuat ide kampanye berdasarkan produk, transaksi, dan pola pelanggan.</p>
          <button
            onClick={onGenerate}
            disabled={loading}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs font-black text-emerald-400 transition-all hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            Generate Promo AI
          </button>
        </div>
      )}
    </aside>
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

function EmptyInsightState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
      <Brain className="mx-auto mb-3 h-8 w-8 text-slate-600" />
      <h3 className="text-sm font-black text-white">Belum ada insight AI</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
        Pilih rentang waktu, lalu klik Generate Insight AI untuk mulai menganalisis performa bisnis.
      </p>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Insight AI
      </button>
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
