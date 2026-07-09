import { NextResponse } from 'next/server';
import { buildBusinessInsightPrompt } from '@/lib/ai/promptBuilder';
import { createChatCompletionJson, getConfiguredLlmTimeoutMs, isLlmConfigured, LlmRequestError } from '@/lib/ai/llmClient';
import { validateBusinessInsightOutput } from '@/lib/ai/aiInsightSchema';
import {
  buildRuleBasedBusinessInsight,
  fetchAiBusinessContext,
  saveBusinessInsight,
  verifyAdminRequest,
  DateRangeInput,
} from '@/lib/ai/serverData';

function fallbackMessageFor(errorType: string) {
  switch (errorType) {
    case 'missing_config':
      return 'LLM API belum dikonfigurasi. Insight menggunakan mode rule-based.';
    case 'timeout':
      return 'LLM membutuhkan waktu terlalu lama. Insight fallback rule-based digunakan.';
    case 'unauthorized':
    case 'forbidden':
    case 'provider_error':
      return 'Provider LLM menolak request. Periksa API key, model, atau akses provider.';
    case 'invalid_json':
      return 'Output LLM tidak valid. Insight fallback rule-based digunakan.';
    default:
      return 'Insight AI belum bisa dibuat. Insight fallback rule-based digunakan.';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessId = typeof body.businessId === 'string' ? body.businessId : '';
    const dateRange = body.dateRange as DateRangeInput | undefined;
    const insightType = typeof body.insightType === 'string' ? body.insightType : undefined;

    if (!businessId) {
      return NextResponse.json({ message: 'Business ID wajib diisi.' }, { status: 400 });
    }

    const auth = await verifyAdminRequest(request, businessId);
    if ('error' in auth) return auth.error;

    const context = await fetchAiBusinessContext(auth.supabaseAdmin, businessId, dateRange);
    const fallback = buildRuleBasedBusinessInsight(context);

    if (!isLlmConfigured()) {
      const response = {
        ...fallback,
        fallbackReason: 'missing_config',
        fallbackMessage: fallbackMessageFor('missing_config'),
      };
      await saveBusinessInsight(auth.supabaseAdmin, businessId, response);
      return NextResponse.json(response);
    }

    try {
      const llmResult = await createChatCompletionJson(buildBusinessInsightPrompt(context, insightType), {
        timeoutMs: getConfiguredLlmTimeoutMs(90000),
        maxTokens: 1200,
        retryCount: 0,
      });
      const validated = validateBusinessInsightOutput(llmResult.data);

      if (!validated) {
        console.warn('Invalid LLM business insight JSON shape. Falling back to rule-based insight.');
        const response = {
          ...fallback,
          fallbackReason: 'invalid_json',
          fallbackMessage: fallbackMessageFor('invalid_json'),
        };
        await saveBusinessInsight(auth.supabaseAdmin, businessId, response);
        return NextResponse.json(response);
      }

      const insight = {
        ...validated,
        generatedAt: new Date().toISOString(),
        source: 'llm' as const,
      };

      await saveBusinessInsight(auth.supabaseAdmin, businessId, insight);
      return NextResponse.json(insight);
    } catch (error) {
      const errorType = error instanceof LlmRequestError ? error.type : 'provider_error';
      console.warn('LLM business insight failed. Falling back to rule-based insight:', {
        type: errorType,
        message: error instanceof Error ? error.message : error,
      });
      const response = {
        ...fallback,
        fallbackReason: errorType,
        fallbackMessage: fallbackMessageFor(errorType),
      };
      await saveBusinessInsight(auth.supabaseAdmin, businessId, response);
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Business insight API error:', error);
    return NextResponse.json({ message: 'Gagal membuat insight bisnis.' }, { status: 500 });
  }
}
