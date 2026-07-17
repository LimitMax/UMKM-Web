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
    .single();

  if (profileError || !profile) {
    return { error: NextResponse.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 401 }) };
  }

  if (profile.role !== 'platform_owner') {
    return { error: NextResponse.json({ message: 'Akses terbatas untuk Platform Owner saja.' }, { status: 403 }) };
  }

  return { supabaseAdmin, userId: userData.user.id };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin, userId } = authResult;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: 'Business ID tidak ditemukan.' }, { status: 400 });
    }

    const { action, reason } = await request.json();

    if (!action) {
      return NextResponse.json({ message: 'Aksi wajib dikirim.' }, { status: 400 });
    }

    // Load current business to see if it exists
    const { data: business, error: loadError } = await supabaseAdmin!
      .from('businesses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (loadError || !business) {
      return NextResponse.json({ message: 'Bisnis tidak ditemukan.' }, { status: 404 });
    }

    let updateFields: Record<string, unknown> = {};

    if (action === 'suspend') {
      if (!reason || !reason.trim()) {
        return NextResponse.json({ message: 'Alasan penangguhan wajib diisi.' }, { status: 400 });
      }
      updateFields = {
        status: 'suspended',
        suspended_reason: reason.trim(),
        suspended_at: new Date().toISOString(),
        suspended_by: userId,
      };
    } else if (action === 'activate') {
      // Determine if active or trial based on trial_ends_at
      const now = new Date();
      const trialEnds = business.trial_ends_at ? new Date(business.trial_ends_at) : null;
      const isTrialActive = trialEnds && trialEnds > now;

      updateFields = {
        status: isTrialActive ? 'trial' : 'active',
        suspended_reason: null,
        suspended_at: null,
        suspended_by: null,
      };
    } else if (action === 'archive') {
      updateFields = {
        status: 'archived',
      };
    } else if (action === 'soft_delete') {
      updateFields = {
        status: 'archived',
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      };
    } else if (action === 'restore') {
      const now = new Date();
      const trialEnds = business.trial_ends_at ? new Date(business.trial_ends_at) : null;
      const isTrialActive = trialEnds && trialEnds > now;
      updateFields = {
        status: isTrialActive ? 'trial' : 'active',
        deleted_at: null,
        deleted_by: null,
      };
    } else {
      return NextResponse.json({ message: 'Aksi tidak dikenali.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin!
      .from('businesses')
      .update(updateFields)
      .eq('id', id);

    if (updateError) {
      console.error('[Platform Business Status Update POST] Update error:', updateError.message);
      return NextResponse.json({ message: 'Gagal memperbarui status bisnis.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Status bisnis berhasil diperbarui.' });
  } catch (error) {
    console.error('[Platform Business Status Update POST] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
