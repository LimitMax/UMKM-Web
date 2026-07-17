import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function verifyAdminBusinessAccess(request: Request, businessId: string) {
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

  const { data: authProfile } = await supabaseAdmin
    .from('profiles')
    .select('role, business_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!authProfile || authProfile.role !== 'admin' || authProfile.business_id !== businessId) {
    return { error: NextResponse.json({ message: 'Akses ditolak. Hanya admin pemilik bisnis.' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const businessId = body?.businessId;
    const planId = body?.planId; // The plan the user is downgrading to

    if (!businessId || !planId) {
      return NextResponse.json({ message: 'Parameter tidak lengkap.' }, { status: 400 });
    }

    const authResult = await verifyAdminBusinessAccess(request, businessId);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;

    // Load plan details
    const { data: targetPlan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (!targetPlan) {
      return NextResponse.json({ message: 'Paket tujuan tidak ditemukan.' }, { status: 404 });
    }

    // Load active subscription
    const { data: activeSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .maybeSingle();

    if (!activeSub) {
      // If there is no active paid subscription (e.g. they are in trial), we can immediately transition them
      // Since it's trial, they can switch plan immediately
      const { error: updateSubErr } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_id: planId,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId);

      if (updateSubErr) throw updateSubErr;

      return NextResponse.json({
        success: true,
        immediate: true,
        message: `Paket berhasil diubah ke ${targetPlan.name}.`
      });
    }

    // Schedule downgrade
    const { error: updateSubErr } = await supabaseAdmin
      .from('subscriptions')
      .update({
        pending_plan_id: planId,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeSub.id);

    if (updateSubErr) throw updateSubErr;

    const renewalDate = activeSub.expires_at || activeSub.renewal_at;
    const dateStr = renewalDate 
      ? new Date(renewalDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'akhir periode aktif';

    return NextResponse.json({
      success: true,
      immediate: false,
      message: `Downgrade ke paket ${targetPlan.name} telah dijadwalkan dan akan diterapkan secara otomatis pada tanggal perpanjangan (${dateStr}).`
    });
  } catch (error) {
    console.error('[API Subscriptions Downgrade POST] Error:', error);
    return NextResponse.json({ message: 'Gagal menjadwalkan downgrade paket.' }, { status: 500 });
  }
}
