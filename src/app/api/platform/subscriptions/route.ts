import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Helper to check platform owner role
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

// GET: Retrieve all subscriptions with business name, plan name, and latest invoice status
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;

    // Fetch subscriptions
    const { data: subs, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id,
        business_id,
        plan_id,
        status,
        started_at,
        trial_start,
        trial_end,
        expires_at,
        renewal_at,
        cancelled_at,
        created_at,
        updated_at,
        businesses (name, slug),
        plans!subscriptions_plan_id_fkey (name, code)
      `)
      .order('created_at', { ascending: false });

    if (subsError) {
      throw subsError;
    }

    // Fetch invoices to map latest billing status
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('id, subscription_id, status, amount, created_at')
      .order('created_at', { ascending: false });

    if (invoicesError) {
      throw invoicesError;
    }

    interface QuerySubRow {
      id: string;
      business_id: string;
      plan_id: string | null;
      status: 'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled';
      started_at: string;
      trial_start: string | null;
      trial_end: string | null;
      expires_at: string | null;
      renewal_at: string | null;
      cancelled_at: string | null;
      created_at: string;
      updated_at: string;
      businesses: { name: string; slug: string | null } | null;
      plans: { name: string; code: string } | null;
    }

    const enriched = (subs as unknown as QuerySubRow[] || []).map((s: QuerySubRow) => {
      // Find latest invoice for this subscription
      const subInvoices = (invoices || []).filter(i => i.subscription_id === s.id);
      const latestInvoice = subInvoices[0] || null;

      return {
        id: s.id,
        business_id: s.business_id,
        business_name: s.businesses?.name || 'UMKM Toko',
        business_slug: s.businesses?.slug || '',
        plan_id: s.plan_id,
        plan_name: s.plans?.name || 'Free Plan',
        plan_code: s.plans?.code || 'free',
        status: s.status,
        started_at: s.started_at,
        trial_start: s.trial_start,
        trial_end: s.trial_end,
        expires_at: s.expires_at,
        renewal_at: s.renewal_at,
        cancelled_at: s.cancelled_at,
        created_at: s.created_at,
        billing_status: latestInvoice ? latestInvoice.status : 'no_invoice',
        latest_invoice_amount: latestInvoice ? latestInvoice.amount : 0,
        invoices: subInvoices
      };
    });

    return NextResponse.json({ subscriptions: enriched });
  } catch (error) {
    console.error('[API Platform Subscriptions GET] Error:', error);
    return NextResponse.json({ message: 'Gagal memuat daftar langganan.' }, { status: 500 });
  }
}
