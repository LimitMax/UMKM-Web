import { createHash } from 'crypto';

export type MidtransPaymentMethod = 'non_cash';

export interface MidtransSnapTransactionPayload {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: {
    first_name?: string;
    phone?: string;
  };
  item_details?: Array<{
    id?: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface MidtransSnapTransactionResponse {
  token: string;
  redirect_url?: string;
}

export interface MidtransNotificationPayload {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  [key: string]: unknown;
}

export type MidtransTransactionStatusResponse = MidtransNotificationPayload;

function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('Midtrans client must only be used on the server side.');
  }
}

export function isMidtransProductionEnabled(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === 'true';
}

export function getMidtransSnapBaseUrl(): string {
  return (process.env.MIDTRANS_SNAP_BASE_URL || 'https://app.sandbox.midtrans.com').replace(/\/+$/, '');
}

export function getMidtransCoreApiBaseUrl(): string {
  return (process.env.MIDTRANS_CORE_API_BASE_URL || 'https://api.sandbox.midtrans.com').replace(/\/+$/, '');
}

export function getMidtransServerKey(): string {
  assertServerOnly();

  if (isMidtransProductionEnabled()) {
    throw new Error('Midtrans production mode is disabled for this phase. Use sandbox credentials only.');
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi.');
  }

  return serverKey;
}

function getBasicAuthHeader(): string {
  const encoded = Buffer.from(`${getMidtransServerKey()}:`).toString('base64');
  return `Basic ${encoded}`;
}

function buildSnapTransactionsUrl(): string {
  return `${getMidtransSnapBaseUrl()}/snap/v1/transactions`;
}

async function readSafeError(response: Response): Promise<string> {
  const text = await response.text();
  return text.slice(0, 500);
}

export async function createSnapTransaction(
  payload: MidtransSnapTransactionPayload
): Promise<MidtransSnapTransactionResponse> {
  assertServerOnly();

  const endpoint = buildSnapTransactionsUrl();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[Midtrans] Snap create response', {
      endpoint,
      status: response.status,
      model: 'snap',
    });
  }

  if (!response.ok) {
    const safeBody = await readSafeError(response);
    console.error('[Midtrans] Snap create failed', {
      endpoint,
      status: response.status,
      body: safeBody,
    });
    throw new Error(`Midtrans Snap request failed with status ${response.status}`);
  }

  const data = (await response.json()) as MidtransSnapTransactionResponse;
  if (!data.token) {
    console.error('[Midtrans] Snap create response missing token', {
      endpoint,
      keys: Object.keys(data || {}),
    });
    throw new Error('Midtrans Snap response tidak memiliki token.');
  }

  return data;
}

export function verifyMidtransNotification(payload: MidtransNotificationPayload): boolean {
  assertServerOnly();

  if (!payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
    return false;
  }

  const signature = createHash('sha512')
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${getMidtransServerKey()}`)
    .digest('hex');

  return signature === payload.signature_key;
}

export async function getMidtransTransactionStatus(
  providerReferenceId: string
): Promise<MidtransTransactionStatusResponse> {
  assertServerOnly();

  const endpoint = `${getMidtransCoreApiBaseUrl()}/v2/${encodeURIComponent(providerReferenceId)}/status`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: getBasicAuthHeader(),
      Accept: 'application/json',
    },
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[Midtrans] status response', {
      endpoint,
      status: response.status,
    });
  }

  if (!response.ok) {
    const safeBody = await readSafeError(response);
    console.error('[Midtrans] status lookup failed', {
      endpoint,
      status: response.status,
      body: safeBody,
    });
    throw new Error(`Midtrans status request failed with status ${response.status}`);
  }

  return response.json();
}
