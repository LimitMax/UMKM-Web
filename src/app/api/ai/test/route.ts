import { NextResponse } from 'next/server';
import { createChatCompletionJson, getLlmSafeConfig, LlmRequestError } from '@/lib/ai/llmClient';

export async function GET() {
  const config = getLlmSafeConfig();

  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      providerStatus: 'failed',
      statusCode: 0,
      errorType: 'missing_config',
      safeMessage: 'LLM API belum dikonfigurasi.',
    });
  }

  try {
    await createChatCompletionJson([
      {
        role: 'system',
        content: 'Return valid JSON only.',
      },
      {
        role: 'user',
        content: 'Return {"ok":true}',
      },
    ], {
      timeoutMs: 20000,
      maxTokens: 100,
      retryCount: 0,
    });

    return NextResponse.json({
      configured: true,
      providerStatus: 'ok',
      statusCode: 200,
      safeMessage: 'LLM test berhasil.',
    });
  } catch (error) {
    const statusCode = error instanceof LlmRequestError ? error.statusCode || 0 : 0;
    const errorType = error instanceof LlmRequestError ? error.type : 'provider_error';
    const safeMessage = error instanceof Error ? error.message : 'LLM test gagal.';

    return NextResponse.json({
      configured: true,
      providerStatus: 'failed',
      statusCode,
      errorType,
      safeMessage,
    });
  }
}
