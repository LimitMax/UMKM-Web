import { NextResponse } from 'next/server';
import { getLlmSafeConfig } from '@/lib/ai/llmClient';

export async function GET() {
  const config = getLlmSafeConfig();

  return NextResponse.json({
    configured: config.configured,
    baseUrlConfigured: config.baseUrlConfigured,
    modelConfigured: config.modelConfigured,
    model: config.model,
    timeoutMs: config.timeoutMs,
  });
}
