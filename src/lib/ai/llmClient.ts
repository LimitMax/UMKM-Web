import { parseJsonObject } from './aiInsightSchema';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

export type LlmErrorType =
  | 'missing_config'
  | 'unauthorized'
  | 'forbidden'
  | 'timeout'
  | 'invalid_json'
  | 'provider_error'
  | 'network_error';

export interface LlmJsonResult {
  data: unknown;
  rawContent: string;
}

export interface LlmRequestOptions {
  timeoutMs?: number;
  maxTokens?: number;
  retryCount?: number;
}

export class LlmRequestError extends Error {
  type: LlmErrorType;
  statusCode?: number;
  responseBody?: string;
  endpoint?: string;
  model?: string;

  constructor(
    type: LlmErrorType,
    message: string,
    details?: { statusCode?: number; responseBody?: string; endpoint?: string; model?: string }
  ) {
    super(message);
    this.name = 'LlmRequestError';
    this.type = type;
    this.statusCode = details?.statusCode;
    this.responseBody = details?.responseBody;
    this.endpoint = details?.endpoint;
    this.model = details?.model;
  }
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL);
}

export function getConfiguredLlmTimeoutMs(defaultMs = 90000): number {
  const parsed = Number(process.env.LLM_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMs;
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  if (normalized.endsWith('/completions')) {
    return `${normalized.slice(0, -'/completions'.length)}/chat/completions`;
  }
  return `${normalized}/chat/completions`;
}

export function getLlmSafeConfig() {
  const baseUrl = process.env.LLM_BASE_URL || '';
  const timeoutMs = getConfiguredLlmTimeoutMs();
  return {
    configured: isLlmConfigured(),
    baseUrlConfigured: Boolean(process.env.LLM_BASE_URL),
    modelConfigured: Boolean(process.env.LLM_MODEL),
    baseUrl,
    endpoint: baseUrl ? buildChatCompletionsUrl(baseUrl) : '',
    model: process.env.LLM_MODEL || '',
    timeoutMs,
  };
}

function logSafeDebug(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(`[LLM] ${message}`, details);
}

function getBearerToken(apiKey: string): string {
  return apiKey.replace(/^Bearer\s+/i, '').trim();
}

function classifyStatus(status: number): LlmErrorType {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  return 'provider_error';
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof LlmRequestError) {
    return error.type === 'network_error';
  }
  return false;
}

async function readProviderError(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return '';
  }
}

export async function createChatCompletionJson(
  messages: ChatMessage[],
  options: LlmRequestOptions = {}
): Promise<LlmJsonResult> {
  if (typeof window !== 'undefined') {
    throw new Error('LLM client can only run on the server.');
  }

  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;

  if (!apiKey || !baseUrl || !model) {
    throw new LlmRequestError('missing_config', 'LLM API belum dikonfigurasi.');
  }

  const endpoint = buildChatCompletionsUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? getConfiguredLlmTimeoutMs();
  const envRetryCount = Number(process.env.LLM_RETRY_COUNT || 0);
  const retryCount = Math.max(0, options.retryCount ?? (Number.isFinite(envRetryCount) ? envRetryCount : 0));
  const safeConfig = { baseUrl, endpoint, model, timeoutMs };
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logSafeDebug('request', { ...safeConfig, attempt: attempt + 1 });

      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: 0.2,
      };

      if (options.maxTokens && options.maxTokens > 0) {
        body.max_tokens = options.maxTokens;
      }

      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getBearerToken(apiKey)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      logSafeDebug('response', { ...safeConfig, status: response.status });

      if (!response.ok && options.maxTokens && response.status === 400) {
        const responseBody = await readProviderError(response);
        console.warn('LLM provider rejected max_tokens. Retrying once without max_tokens:', {
          endpoint,
          model,
          statusCode: response.status,
          responseBody,
        });
        delete body.max_tokens;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getBearerToken(apiKey)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        logSafeDebug('response_without_max_tokens', { ...safeConfig, status: response.status });
      }

      if (!response.ok) {
        const responseBody = await readProviderError(response);
        const type = classifyStatus(response.status);
        console.warn('LLM provider rejected request:', {
          endpoint,
          model,
          statusCode: response.status,
          responseBody,
        });
        throw new LlmRequestError(type, `LLM request failed with status ${response.status}`, {
          statusCode: response.status,
          responseBody,
          endpoint,
          model,
        });
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new LlmRequestError('provider_error', 'LLM returned an empty response.', { endpoint, model });
      }

      try {
        return {
          rawContent: content,
          data: parseJsonObject(content),
        };
      } catch (error) {
        console.warn('LLM JSON parse failed:', {
          endpoint,
          model,
          message: error instanceof Error ? error.message : 'Unknown parse error',
          rawContentPreview: content.slice(0, 500),
        });
        throw new LlmRequestError('invalid_json', 'Output LLM tidak valid.', { endpoint, model });
      }
    } catch (error) {
      const classifiedError =
        error instanceof DOMException && error.name === 'AbortError'
          ? new LlmRequestError('timeout', 'LLM request timeout', { endpoint, model })
          : error instanceof TypeError
            ? new LlmRequestError('network_error', 'LLM network request failed.', { endpoint, model })
            : error;

      if (classifiedError instanceof LlmRequestError && classifiedError.type === 'timeout') {
        console.warn('LLM request timed out:', { endpoint, model, timeoutMs });
      }

      lastError = classifiedError;
      if (attempt >= retryCount || !shouldRetry(classifiedError)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 450));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new LlmRequestError('network_error', 'LLM request failed.');
}
