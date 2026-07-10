// src/app/api/admin/payments/health/route.ts

import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { paymentConfig } from '@/lib/payments/paymentConfig';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 });
    }

    // Check user profile for admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ message: 'Hanya admin yang dapat mengakses status kesehatan sistem.' }, { status: 403 });
    }

    const warnings: string[] = [];
    let canCreatePayment = true;

    // Check configuration properties based on active mode
    if (paymentConfig.MIDTRANS_IS_PRODUCTION) {
      if (!paymentConfig.ENABLE_PRODUCTION_PAYMENTS) {
        warnings.push('ENABLE_PRODUCTION_PAYMENTS bernilai false. Transaksi produksi tidak aktif.');
        canCreatePayment = false;
      }
      if (!paymentConfig.MIDTRANS_SERVER_KEY) {
        warnings.push('Production MIDTRANS_SERVER_KEY tidak ditemukan.');
        canCreatePayment = false;
      }
      if (!paymentConfig.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
        warnings.push('Production NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak ditemukan.');
        canCreatePayment = false;
      }
      if (!paymentConfig.MIDTRANS_MERCHANT_ID) {
        warnings.push('Production MIDTRANS_MERCHANT_ID tidak ditemukan.');
      }
      if (!paymentConfig.NEXT_PUBLIC_APP_URL) {
        warnings.push('Production NEXT_PUBLIC_APP_URL tidak ditemukan.');
        canCreatePayment = false;
      } else {
        if (!paymentConfig.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
          warnings.push('NEXT_PUBLIC_APP_URL wajib menggunakan HTTPS di mode produksi.');
          canCreatePayment = false;
        }
        const appUrlLower = paymentConfig.NEXT_PUBLIC_APP_URL.toLowerCase();
        if (appUrlLower.includes('localhost') || appUrlLower.includes('127.0.0.1')) {
          warnings.push('NEXT_PUBLIC_APP_URL tidak boleh berupa localhost/127.0.0.1 di mode produksi.');
          canCreatePayment = false;
        }
      }

      const webhookUrl = paymentConfig.MIDTRANS_WEBHOOK_URL || `${paymentConfig.NEXT_PUBLIC_APP_URL}/api/webhooks/midtrans`;
      if (!webhookUrl.startsWith('https://')) {
        warnings.push('Midtrans Webhook notification URL wajib menggunakan HTTPS di mode produksi.');
      }
    } else {
      // Sandbox warning indicator checks
      if (!paymentConfig.MIDTRANS_SERVER_KEY) {
        warnings.push('Sandbox MIDTRANS_SERVER_KEY tidak ditemukan.');
        canCreatePayment = false;
      }
      if (!paymentConfig.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
        warnings.push('Sandbox NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak ditemukan.');
      }
    }

    // Check for last webhook received if available
    let lastWebhookReceivedAt: string | null = null;
    try {
      const { data: latestEvent } = await supabaseAdmin
        .from('payment_events')
        .select('created_at')
        .eq('event_type', 'webhook_received')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestEvent) {
        lastWebhookReceivedAt = latestEvent.created_at;
      }
    } catch (e) {
      console.warn('[Health check API] Failed to fetch latest webhook event:', e);
    }

    return NextResponse.json({
      provider: 'midtrans',
      environment: paymentConfig.MIDTRANS_IS_PRODUCTION ? 'production' : 'sandbox',
      isProduction: paymentConfig.MIDTRANS_IS_PRODUCTION,
      productionEnabled: paymentConfig.ENABLE_PRODUCTION_PAYMENTS,
      hasMerchantId: !!paymentConfig.MIDTRANS_MERCHANT_ID,
      hasClientKey: !!paymentConfig.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
      hasServerKey: !!paymentConfig.MIDTRANS_SERVER_KEY,
      snapBaseUrl: paymentConfig.MIDTRANS_SNAP_BASE_URL,
      coreApiBaseUrl: paymentConfig.MIDTRANS_CORE_API_BASE_URL,
      webhookUrl: paymentConfig.MIDTRANS_WEBHOOK_URL || `${paymentConfig.NEXT_PUBLIC_APP_URL}/api/webhooks/midtrans`,
      appUrl: paymentConfig.NEXT_PUBLIC_APP_URL,
      canCreatePayment,
      lastWebhookReceivedAt,
      warnings,
    });
  } catch (error) {
    console.error('[Payment Health Check API] Failed:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
