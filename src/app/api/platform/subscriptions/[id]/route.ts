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

// POST: Modify subscription state (Cancel, Edit Renewal)
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const body = await request.json();
    const { action, renewalDate, expiresDate } = body;

    if (action === 'cancel') {
      const { error: cancelError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (cancelError) {
        throw cancelError;
      }
      return NextResponse.json({ success: true, message: 'Langganan berhasil dibatalkan.' });
    }

    if (action === 'edit_renewal') {
      if (!renewalDate) {
        return NextResponse.json({ message: 'Tanggal perpanjangan wajib diisi.' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          renewal_at: new Date(renewalDate).toISOString(),
          expires_at: expiresDate ? new Date(expiresDate).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }
      return NextResponse.json({ success: true, message: 'Tanggal perpanjangan berhasil diperbarui.' });
    }

    return NextResponse.json({ message: 'Aksi tidak didukung.' }, { status: 400 });
  } catch (error) {
    console.error('[API Platform Subscriptions ID POST] Error:', error);
    return NextResponse.json({ message: 'Gagal memperbarui langganan.' }, { status: 500 });
  }
}
