import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function verifyPlatformOwner(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { error: NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 }) };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return { error: NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'platform_owner') {
    return { error: NextResponse.json({ message: 'Akses ditolak. Khusus Platform Owner.' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

// GET: platform health monitoring check
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const nowStr = new Date().toISOString();

    // 1. Check Supabase Database
    let dbStatus = 'Healthy';
    let dbError = '';
    try {
      const { error } = await supabaseAdmin.from('businesses').select('id').limit(1);
      if (error) throw error;
    } catch (e) {
      dbStatus = 'Offline';
      dbError = e instanceof Error ? e.message : 'Koneksi database gagal';
    }

    // 2. Check Supabase Auth
    let authStatus = 'Healthy';
    let authError = '';
    try {
      // Trigger a light authentication read check
      const { error } = await supabaseAdmin.auth.getSession();
      if (error) throw error;
    } catch (e) {
      authStatus = 'Warning';
      authError = e instanceof Error ? e.message : 'Layanan auth tidak merespon optimal';
    }

    // 3. Check Midtrans Core API
    let midtransStatus = 'Healthy';
    let midtransError = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://api.sandbox.midtrans.com', {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeout);

      if (!res) {
        midtransStatus = 'Offline';
        midtransError = 'Sandbox API tidak terhubung';
      }
    } catch (e) {
      midtransStatus = 'Offline';
      midtransError = e instanceof Error ? e.message : 'Koneksi Midtrans terputus';
    }

    // 4. Check Webhook Status
    let webhookStatus = 'Healthy';
    let lastWebhookTime = null;
    try {
      const { data } = await supabaseAdmin
        .from('payment_events')
        .select('created_at')
        .eq('event_type', 'webhook_received')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        lastWebhookTime = data.created_at;
        const diffMs = Date.now() - new Date(lastWebhookTime).getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);
        if (diffHrs > 72) {
          webhookStatus = 'Warning'; // Warning if no webhook activity in 3 days
        }
      } else {
        webhookStatus = 'Warning';
      }
    } catch {
      webhookStatus = 'Warning';
    }

    // 5. Check Nara LLM Service
    let llmStatus = 'Healthy';
    let llmError = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://router.bynara.id/v1', {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeout);

      if (!res) {
        llmStatus = 'Offline';
        llmError = 'Layanan AI Gateway tidak merespon';
      }
    } catch (e) {
      llmStatus = 'Offline';
      llmError = e instanceof Error ? e.message : 'Koneksi Nara LLM terputus';
    }

    return NextResponse.json({
      services: [
        {
          name: 'Supabase Database',
          status: dbStatus,
          lastChecked: nowStr,
          automatic: true,
          error: dbError || null
        },
        {
          name: 'Supabase Auth',
          status: authStatus,
          lastChecked: nowStr,
          automatic: true,
          error: authError || null
        },
        {
          name: 'Supabase Realtime',
          status: 'Healthy',
          lastChecked: nowStr,
          automatic: false,
          error: 'Unavailable for automatic monitoring'
        },
        {
          name: 'Supabase Storage',
          status: 'Healthy',
          lastChecked: nowStr,
          automatic: false,
          error: 'Unavailable for automatic monitoring'
        },
        {
          name: 'Midtrans Payment API',
          status: midtransStatus,
          lastChecked: nowStr,
          automatic: true,
          error: midtransError || null
        },
        {
          name: 'Midtrans Webhook',
          status: webhookStatus,
          lastChecked: nowStr,
          automatic: true,
          error: lastWebhookTime ? `Last webhook event: ${new Date(lastWebhookTime).toLocaleString('id-ID')}` : 'Belum ada event webhook tercatat'
        },
        {
          name: 'Nara LLM',
          status: llmStatus,
          lastChecked: nowStr,
          automatic: true,
          error: llmError || null
        },
        {
          name: 'Vercel Deployment',
          status: 'Healthy',
          lastChecked: nowStr,
          automatic: false,
          error: 'Unavailable for automatic monitoring'
        }
      ]
    });
  } catch (error) {
    console.error('[API Platform Monitoring GET] Error:', error);
    return NextResponse.json({ message: 'Gagal memuat status monitoring platform.' }, { status: 500 });
  }
}
