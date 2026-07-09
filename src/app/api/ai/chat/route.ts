import { NextResponse } from 'next/server';
import { buildChatBusinessContext, ChatDateRangeKey } from '@/lib/ai/chatContextBuilder';
import { buildOwnerChatPrompt, ChatHistoryMessage } from '@/lib/ai/chatPromptBuilder';
import { createChatCompletionJson, getConfiguredLlmTimeoutMs, isLlmConfigured, LlmRequestError } from '@/lib/ai/llmClient';
import { verifyAdminRequest } from '@/lib/ai/serverData';
import { AI_DATE_RANGE_LABELS, isAiDateRangeKey } from '@/lib/ai/dateRange';

interface ChatResponseShape {
  answer: string;
  suggestedActions: string[];
  source: 'llm' | 'fallback';
  generatedAt: string;
  dateRange: string;
  dateRangeLabel: string;
}

function validateRange(value: unknown): ChatDateRangeKey {
  return isAiDateRangeKey(value) ? value : '7d';
}

function validateHistory(value: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .map((item) => ({
      role: item.role as 'user' | 'assistant',
      content: String(item.content).slice(0, 500),
    }))
    .slice(-6);
}

function validateLlmChatOutput(value: unknown): Pick<ChatResponseShape, 'answer' | 'suggestedActions'> | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const answer = typeof data.answer === 'string' ? data.answer.trim() : '';
  const suggestedActions = Array.isArray(data.suggestedActions)
    ? data.suggestedActions.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean).slice(0, 3)
    : [];

  if (!answer) return null;
  return { answer, suggestedActions };
}

function fallbackFor(type: string, context?: Awaited<ReturnType<typeof buildChatBusinessContext>>): Pick<ChatResponseShape, 'answer' | 'suggestedActions'> {
  if (type === 'missing_config') {
    return {
      answer: 'LLM belum dikonfigurasi. Saya masih bisa memberikan ringkasan dasar berbasis data transaksi.',
      suggestedActions: buildBasicActions(context),
    };
  }

  if (type === 'timeout') {
    return {
      answer: 'AI membutuhkan waktu terlalu lama. Coba tanyakan dengan rentang data lebih kecil.',
      suggestedActions: ['Gunakan rentang Hari Ini.', 'Tanyakan satu topik spesifik seperti stok atau delivery.', 'Coba ulang beberapa saat lagi.'],
    };
  }

  return {
    answer: buildBasicSummary(context),
    suggestedActions: buildBasicActions(context),
  };
}

function buildBasicSummary(context?: Awaited<ReturnType<typeof buildChatBusinessContext>>) {
  if (!context) {
    return 'Saya belum bisa membaca konteks bisnis saat ini. Coba ulangi pertanyaan beberapa saat lagi.';
  }

  const bestSeller = context.products.bestSellingTop5[0]?.name || 'belum cukup data produk terlaris';
  const lowStock = context.products.lowStockTop5.map((item) => item.name).slice(0, 3).join(', ') || 'tidak ada stok kritis';
  return `Ringkasan dasar: omzet pada rentang ini ${context.sales.totalRevenue}, total order ${context.sales.totalOrders}, AOV ${context.sales.averageOrderValue}. Produk terlaris: ${bestSeller}. Stok yang perlu dipantau: ${lowStock}.`;
}

function buildBasicActions(context?: Awaited<ReturnType<typeof buildChatBusinessContext>>) {
  if (!context) return ['Coba ulangi pertanyaan.', 'Gunakan rentang data lebih kecil.'];

  return [
    context.products.lowStockTop5[0]
      ? `Prioritaskan restock ${context.products.lowStockTop5[0].name}.`
      : 'Pantau stok produk aktif sebelum jam ramai.',
    context.products.bestSellingTop5[0]
      ? `Pastikan bahan baku ${context.products.bestSellingTop5[0].name} aman.`
      : 'Dorong transaksi awal agar pola produk terbaca.',
    context.delivery.deliveryOrderCount > 0
      ? 'Evaluasi ongkir dan ETA delivery untuk menjaga margin.'
      : 'Uji promo sederhana untuk meningkatkan order hari ini.',
  ];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessId = typeof body.businessId === 'string' ? body.businessId : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : '';
    const conversationHistory = validateHistory(body.conversationHistory);
    const dateRange = validateRange(body.dateRange);

    if (!businessId) {
      return NextResponse.json({ message: 'Business ID wajib diisi.' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ message: 'Pertanyaan wajib diisi.' }, { status: 400 });
    }

    const auth = await verifyAdminRequest(request, businessId);
    if ('error' in auth) return auth.error;

    const context = await buildChatBusinessContext(auth.supabaseAdmin, businessId, dateRange);

    if (!isLlmConfigured()) {
      const fallback = fallbackFor('missing_config', context);
      return NextResponse.json({
        ...fallback,
        source: 'fallback',
        generatedAt: new Date().toISOString(),
        dateRange,
        dateRangeLabel: AI_DATE_RANGE_LABELS[dateRange],
      } satisfies ChatResponseShape);
    }

    try {
      const llmResult = await createChatCompletionJson(buildOwnerChatPrompt(context, message, conversationHistory), {
        timeoutMs: getConfiguredLlmTimeoutMs(60000),
        maxTokens: 900,
        retryCount: 0,
      });
      const validated = validateLlmChatOutput(llmResult.data);

      if (!validated) {
        const fallback = fallbackFor('invalid_json', context);
        return NextResponse.json({
          ...fallback,
          source: 'fallback',
          generatedAt: new Date().toISOString(),
          dateRange,
          dateRangeLabel: AI_DATE_RANGE_LABELS[dateRange],
        } satisfies ChatResponseShape);
      }

      return NextResponse.json({
        ...validated,
        source: 'llm',
        generatedAt: new Date().toISOString(),
        dateRange,
        dateRangeLabel: AI_DATE_RANGE_LABELS[dateRange],
      } satisfies ChatResponseShape);
    } catch (error) {
      const type = error instanceof LlmRequestError ? error.type : 'provider_error';
      console.warn('LLM owner chat failed. Falling back:', {
        type,
        message: error instanceof Error ? error.message : error,
      });
      const fallback = fallbackFor(type, context);
      return NextResponse.json({
        ...fallback,
        source: 'fallback',
        generatedAt: new Date().toISOString(),
        dateRange,
        dateRangeLabel: AI_DATE_RANGE_LABELS[dateRange],
      } satisfies ChatResponseShape);
    }
  } catch (error) {
    console.error('AI chat API error:', error);
    return NextResponse.json({ message: 'Gagal memproses chat AI.' }, { status: 500 });
  }
}
