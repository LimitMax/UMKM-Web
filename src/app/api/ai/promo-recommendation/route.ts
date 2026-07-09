import { NextResponse } from 'next/server';
import { buildPromoPrompt } from '@/lib/ai/promptBuilder';
import { createChatCompletionJson, getConfiguredLlmTimeoutMs, isLlmConfigured, LlmRequestError } from '@/lib/ai/llmClient';
import { normalizeAiDateRange } from '@/lib/ai/dateRange';
import { validatePromoOutput } from '@/lib/ai/aiInsightSchema';
import {
  buildRuleBasedPromoRecommendation,
  fetchAiBusinessContext,
  savePromoRecommendation,
  verifyAdminRequest,
} from '@/lib/ai/serverData';

function fallbackMessageFor(errorType: string) {
  switch (errorType) {
    case 'missing_config':
      return 'LLM API belum dikonfigurasi. Rekomendasi promo menggunakan mode rule-based.';
    case 'timeout':
      return 'LLM membutuhkan waktu terlalu lama. Promo fallback rule-based digunakan.';
    case 'unauthorized':
    case 'forbidden':
    case 'provider_error':
      return 'Provider LLM menolak request. Periksa API key, model, atau akses provider.';
    case 'invalid_json':
      return 'Output LLM tidak valid. Promo fallback rule-based digunakan.';
    default:
      return 'Rekomendasi promo AI belum bisa dibuat. Promo fallback rule-based digunakan.';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessId = typeof body.businessId === 'string' ? body.businessId : '';
    const dateRange = normalizeAiDateRange(body.dateRange);

    if (!businessId) {
      return NextResponse.json({ message: 'Business ID wajib diisi.' }, { status: 400 });
    }

    const auth = await verifyAdminRequest(request, businessId);
    if ('error' in auth) return auth.error;

    const context = await fetchAiBusinessContext(auth.supabaseAdmin, businessId, dateRange);
    const fallback = {
      ...buildRuleBasedPromoRecommendation(context),
      dateRange: dateRange.key,
      dateRangeLabel: dateRange.label,
    };

    if (!isLlmConfigured()) {
      const response = {
        ...fallback,
        fallbackReason: 'missing_config',
        fallbackMessage: fallbackMessageFor('missing_config'),
      };
      await savePromoRecommendation(auth.supabaseAdmin, businessId, context, response);
      return NextResponse.json(response);
    }

    try {
      const llmResult = await createChatCompletionJson(buildPromoPrompt(context), {
        timeoutMs: getConfiguredLlmTimeoutMs(60000),
        maxTokens: 1000,
        retryCount: 0,
      });
      const validated = validatePromoOutput(llmResult.data);

      if (!validated) {
        console.warn('Invalid LLM promo JSON shape. Falling back to rule-based promo.');
        const response = {
          ...fallback,
          fallbackReason: 'invalid_json',
          fallbackMessage: fallbackMessageFor('invalid_json'),
        };
        await savePromoRecommendation(auth.supabaseAdmin, businessId, context, response);
        return NextResponse.json(response);
      }

      const promo = {
        ...validated,
        generatedAt: new Date().toISOString(),
        source: 'llm' as const,
        dateRange: dateRange.key,
        dateRangeLabel: dateRange.label,
      };

      await savePromoRecommendation(auth.supabaseAdmin, businessId, context, promo);
      return NextResponse.json(promo);
    } catch (error) {
      const errorType = error instanceof LlmRequestError ? error.type : 'provider_error';
      console.warn('LLM promo recommendation failed. Falling back to rule-based promo:', {
        type: errorType,
        message: error instanceof Error ? error.message : error,
      });
      const response = {
        ...fallback,
        fallbackReason: errorType,
        fallbackMessage: fallbackMessageFor(errorType),
      };
      await savePromoRecommendation(auth.supabaseAdmin, businessId, context, response);
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Promo recommendation API error:', error);
    return NextResponse.json({ message: 'Gagal membuat rekomendasi promo.' }, { status: 500 });
  }
}
