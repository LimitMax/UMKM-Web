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
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { insightService } from '../../../services/insightService';
import { orderService } from '../../../services/orderService';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../components/AuthProvider';
import { supabaseClient } from '../../../lib/supabase/client';
import { AIInsight, GeneratedBusinessInsight, GeneratedPromoRecommendation, PromoRecommendation } from '../../../types';
import { formatRupiah } from '../../../utils/format';

type CaptionTab = 'whatsapp' | 'instagram' | 'short';

const fallbackMessage = 'LLM API belum dikonfigurasi. Insight menggunakan mode rule-based.';

interface AiStatus {
  configured: boolean;
  baseUrlConfigured: boolean;
  modelConfigured: boolean;
  model: string;
  timeoutMs: number;
}

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

function InsightList({ items, empty }: { items: string[]; empty: string }) {
  const visibleItems = items.length > 0 ? items : [empty];
  return (
    <div className="flex flex-col gap-2">
      {visibleItems.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-xl border border-slate-850 bg-slate-950/50 p-3">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-[10px] font-black text-emerald-400">
            {index + 1}
          </span>
          <p className="text-xs leading-relaxed text-slate-300">{item}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminInsightsPage() {
  const { profile, role } = useAuth();
  const [legacyInsight, setLegacyInsight] = useState<AIInsight | null>(null);
  const [businessInsight, setBusinessInsight] = useState<GeneratedBusinessInsight | null>(null);
  const [promo, setPromo] = useState<GeneratedPromoRecommendation | null>(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [captionTab, setCaptionTab] = useState<CaptionTab>('whatsapp');
  const [copiedCaption, setCopiedCaption] = useState<CaptionTab | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);

  const isAdmin = role === 'admin';
  const businessId = profile?.business_id;

  useEffect(() => {
    const loadRuleBasedInsight = async () => {
      if (!businessId || !isAdmin) {
        setLoadingBase(false);
        return;
      }

      setLoadingBase(true);
      setErrorMessage('');
      try {
        const [orders, products] = await Promise.all([
          orderService.getOrdersByBusinessId(businessId),
          productService.getProducts('supabase', businessId),
        ]);
        const ruleBased = insightService.generateInsights(orders, products);
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
    const loadAiStatus = async () => {
      try {
        const response = await fetch('/api/ai/status');
        if (!response.ok) return;
        const data = await response.json();
        setAiStatus(data as AiStatus);
      } catch (error) {
        console.error('Failed to load AI status:', error);
      }
    };

    loadAiStatus();
  }, []);

  const hasLlmResult = businessInsight?.source === 'llm' || promo?.source === 'llm';
  const statusLabel = hasLlmResult ? 'Insight AI Aktif' : 'Mode Rule-Based';
  const statusClass = hasLlmResult
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  const lastGeneratedAt = businessInsight?.generatedAt || promo?.generatedAt;
  const insightHelperText = businessInsight?.fallbackMessage
    || (aiStatus && !aiStatus.configured ? fallbackMessage : 'Gunakan AI untuk membaca pola penjualan, risiko stok, delivery, dan ETA.');
  const activeCaption = useMemo(() => {
    if (!promo) return '';
    if (captionTab === 'whatsapp') return promo.whatsappCaption;
    if (captionTab === 'instagram') return promo.instagramCaption;
    return promo.shortCaption;
  }, [captionTab, promo]);

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
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      const nextInsight = data as GeneratedBusinessInsight;
      setBusinessInsight(nextInsight);
      if (nextInsight.source === 'rule_based' && nextInsight.fallbackMessage) {
        setErrorMessage(nextInsight.fallbackMessage);
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
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      const nextPromo = data as GeneratedPromoRecommendation;
      setPromo(nextPromo);
      if (nextPromo.source === 'rule_based' && nextPromo.fallbackMessage) {
        setErrorMessage(nextPromo.fallbackMessage);
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

  if (!isAdmin) {
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
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Cashier tidak dapat membuat business insights. Gunakan akun admin untuk mengakses fitur AI ini.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Brain className="h-6 w-6 text-emerald-400" />
            <span>AI Business Insights</span>
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Analisis bisnis dan rekomendasi promo berbasis data Supabase. LLM hanya dipanggil saat admin menekan tombol generate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {aiStatus?.configured && (
            <span className="rounded-xl border border-slate-850 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-400">
              LLM siap: {aiStatus.model} / {Math.round(aiStatus.timeoutMs / 1000)}d
            </span>
          )}
          <span className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wide ${statusClass}`}>
            {statusLabel}
          </span>
          <span className="rounded-xl border border-slate-850 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-400">
            Terakhir dibuat: {formatDateTime(lastGeneratedAt)}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
          {errorMessage}
        </div>
      )}

      {loadingBase ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-850 py-20 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Sedang menyiapkan analisis data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-6 xl:col-span-2">
            <section className="glass rounded-3xl border border-slate-800 p-6">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>Business Insight</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {insightHelperText}
                  </p>
                </div>
                <button
                  onClick={generateBusinessInsight}
                  disabled={generatingInsight}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>{generatingInsight ? 'Menganalisis...' : 'Generate Insight AI'}</span>
                </button>
              </div>

              {businessInsight ? (
                <div className="flex flex-col gap-5">
                  <div className="rounded-2xl border border-slate-850 bg-slate-950/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Ringkasan Eksekutif</span>
                      {businessInsight.source === 'rule_based' && (
                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                          Fallback Rule-Based
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">{businessInsight.executiveSummary}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InsightCard title="Highlight Penjualan" icon={<Zap className="h-4 w-4" />}>
                      <InsightList items={businessInsight.salesHighlights} empty="Belum ada highlight penjualan." />
                    </InsightCard>
                    <InsightCard title="Risiko Bisnis" icon={<AlertTriangle className="h-4 w-4" />}>
                      <InsightList items={businessInsight.riskAlerts} empty="Tidak ada risiko utama." />
                    </InsightCard>
                    <InsightCard title="Produk" icon={<Award className="h-4 w-4" />}>
                      <InsightList items={businessInsight.productInsights} empty="Belum ada insight produk." />
                    </InsightCard>
                    <InsightCard title="Stok" icon={<ClipboardCheck className="h-4 w-4" />}>
                      <InsightList items={businessInsight.stockRecommendations} empty="Tidak ada rekomendasi stok." />
                    </InsightCard>
                    <InsightCard title="Delivery & ETA" icon={<RefreshCw className="h-4 w-4" />}>
                      <InsightList
                        items={[...businessInsight.deliveryInsights, ...businessInsight.etaInsights]}
                        empty="Belum ada data delivery atau ETA."
                      />
                    </InsightCard>
                    <InsightCard title="Action Plan" icon={<Target className="h-4 w-4" />}>
                      <InsightList
                        items={businessInsight.actionPlan.map((item) => `${item.priority.toUpperCase()}: ${item.action}`)}
                        empty="Belum ada action plan."
                      />
                    </InsightCard>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-slate-850 bg-slate-950/40 p-4">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">Mode Rule-Based</span>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {legacyInsight?.summary || 'Belum ada data transaksi untuk dianalisis.'}
                    </p>
                  </div>
                  <InsightList items={legacyInsight?.recommendations || []} empty="Belum ada rekomendasi rule-based." />
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-slate-850 bg-slate-900 p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Rekomendasi Kampanye Promo</span>
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Promo siap pakai dengan target, harga, sinyal data, caption, dan checklist.
                </p>
              </div>
              {promo?.source === 'rule_based' && (
                <span className="whitespace-nowrap rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[9px] font-bold text-amber-300">
                  Fallback Rule-Based
                </span>
              )}
            </div>

            <button
              onClick={generatePromo}
              disabled={generatingPromo}
              className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{generatingPromo ? 'Membuat promo...' : 'Generate Rekomendasi Promo AI'}</span>
            </button>

            {promo ? (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-base font-black leading-tight text-white">{promo.suggestedPromoName}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{promo.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-850 bg-slate-950/50 p-4">
                  <PromoMetric label="Produk Utama" value={promo.mainProductName} />
                  <PromoMetric label="Bundle" value={promo.bundleProductName || 'Tidak Ada'} />
                  <PromoMetric label="Harga Normal" value={formatRupiah(promo.normalPrice)} mono />
                  <PromoMetric label="Harga Promo" value={formatRupiah(promo.suggestedPrice)} mono highlight />
                  <PromoMetric label="Estimasi Hemat" value={formatRupiah(promo.estimatedSavings)} mono />
                  <PromoMetric label="Confidence" value={`${promo.confidenceScore}%`} highlight />
                </div>

                <div className="rounded-2xl border border-slate-850 bg-slate-950/40 p-4 text-xs">
                  <div className="mb-3 grid grid-cols-1 gap-3">
                    <PromoMetric label="Goal" value={promo.campaignGoal} />
                    <PromoMetric label="Target Pelanggan" value={promo.targetCustomer} />
                    <PromoMetric label="Waktu Terbaik" value={promo.targetTime} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {promo.basedOnSignals.map((signal, index) => (
                      <span key={`${signal}-${index}`} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-400">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-850 bg-slate-950/50 p-4">
                  <div className="mb-3 flex rounded-xl border border-slate-850 bg-slate-900 p-1">
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
                  <p className="min-h-28 whitespace-pre-line rounded-xl border border-slate-850 bg-slate-900 p-3 text-xs leading-relaxed text-slate-300">
                    {activeCaption}
                  </p>
                  <button
                    onClick={copyCaption}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500 hover:text-slate-950"
                  >
                    {copiedCaption === captionTab ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCaption === captionTab ? 'Caption Tersalin' : 'Copy Caption'}</span>
                  </button>
                </div>

                <div>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">Checklist Kampanye</span>
                  <InsightList items={promo.checklist} empty="Belum ada checklist." />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-850 p-6 text-center text-xs text-slate-500">
                Belum ada rekomendasi promo. Buat transaksi atau klik generate untuk memakai data terbaru.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function InsightCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-850 bg-slate-900/70 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-white">
        <span className="text-emerald-400">{icon}</span>
        <span>{title}</span>
      </h3>
      {children}
    </div>
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
