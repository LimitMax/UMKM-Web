import {
  MIDTRANS_PRODUCTION_SNAP_URL,
  MIDTRANS_SANDBOX_SNAP_URL,
  MIDTRANS_PRODUCTION_CORE_URL,
  MIDTRANS_SANDBOX_CORE_URL
} from '@/config/payment';

const isServer = typeof window === 'undefined';

export interface PaymentConfig {
  MIDTRANS_IS_PRODUCTION: boolean;
  MIDTRANS_MERCHANT_ID?: string;
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_SNAP_BASE_URL: string;
  MIDTRANS_CORE_API_BASE_URL: string;
  NEXT_PUBLIC_APP_URL: string;
  MIDTRANS_WEBHOOK_URL?: string;
  ENABLE_PRODUCTION_PAYMENTS: boolean;
}

export const paymentConfig: PaymentConfig = {
  MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  MIDTRANS_MERCHANT_ID: process.env.MIDTRANS_MERCHANT_ID,
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
  MIDTRANS_SERVER_KEY: isServer ? process.env.MIDTRANS_SERVER_KEY : undefined,
  MIDTRANS_SNAP_BASE_URL: process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? MIDTRANS_PRODUCTION_SNAP_URL
    : MIDTRANS_SANDBOX_SNAP_URL,
  MIDTRANS_CORE_API_BASE_URL: process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? MIDTRANS_PRODUCTION_CORE_URL
    : MIDTRANS_SANDBOX_CORE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  MIDTRANS_WEBHOOK_URL: process.env.MIDTRANS_WEBHOOK_URL,
  ENABLE_PRODUCTION_PAYMENTS: process.env.ENABLE_PRODUCTION_PAYMENTS === 'true',
};

/**
 * Validate payment configuration parameters.
 * Throws an error on server-side if configuration is invalid for the active mode.
 */
export function validatePaymentConfig(): void {
  if (!isServer) return; // Only validate on server-side to prevent exposing keys or environment issues on client

  if (!paymentConfig.MIDTRANS_IS_PRODUCTION) {
    // Sandbox mode validations
    if (!paymentConfig.MIDTRANS_SERVER_KEY) {
      throw new Error('MIDTRANS_SERVER_KEY is missing in Sandbox mode.');
    }
    return;
  }

  // Production mode validations (strict go-live readiness criteria)
  if (paymentConfig.MIDTRANS_IS_PRODUCTION) {
    if (!paymentConfig.ENABLE_PRODUCTION_PAYMENTS) {
      throw new Error('ENABLE_PRODUCTION_PAYMENTS must be set to true in production environment.');
    }
    if (!paymentConfig.MIDTRANS_SERVER_KEY) {
      throw new Error('MIDTRANS_SERVER_KEY is missing for production mode.');
    }
    if (!paymentConfig.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
      throw new Error('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY is missing for production mode.');
    }
    if (!paymentConfig.MIDTRANS_MERCHANT_ID) {
      throw new Error('MIDTRANS_MERCHANT_ID is missing for production mode.');
    }
    if (!paymentConfig.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL is missing for production mode.');
    }
    
    // NEXT_PUBLIC_APP_URL must be HTTPS
    if (!paymentConfig.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS in production mode.');
    }
    
    // NEXT_PUBLIC_APP_URL must not point to localhost
    const appUrlLower = paymentConfig.NEXT_PUBLIC_APP_URL.toLowerCase();
    if (appUrlLower.includes('localhost') || appUrlLower.includes('127.0.0.1')) {
      throw new Error('NEXT_PUBLIC_APP_URL cannot be localhost/127.0.0.1 in production mode.');
    }

    // Webhook configuration checks
    const webhookUrl = paymentConfig.MIDTRANS_WEBHOOK_URL || `${paymentConfig.NEXT_PUBLIC_APP_URL}/api/webhooks/midtrans`;
    if (!webhookUrl.startsWith('https://')) {
      throw new Error('Midtrans Webhook notification URL must use HTTPS in production mode.');
    }
  }
}
