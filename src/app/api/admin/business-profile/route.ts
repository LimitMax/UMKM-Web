import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  mapBusinessProfileToSupabaseBusinessUpdate,
  mapSupabaseBusinessToBusinessProfile,
} from '@/lib/data/mappers';
import type { BusinessProfile } from '@/types';

export const runtime = 'nodejs';

interface RequestBody {
  businessId?: string;
  profile?: Partial<BusinessProfile>;
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const businessId = typeof body?.businessId === 'string' ? body.businessId : '';
    const profile = body?.profile;

    if (!businessId || !profile) {
      return NextResponse.json({ message: 'Payload profil bisnis tidak valid.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 });
    }

    const { data: authProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, business_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !authProfile) {
      return NextResponse.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 403 });
    }

    if (authProfile.role !== 'admin') {
      return NextResponse.json({ message: 'Hanya admin yang dapat mengubah pengaturan bisnis.' }, { status: 403 });
    }

    if (authProfile.business_id !== businessId) {
      return NextResponse.json({ message: 'Business ID tidak sesuai dengan akun Anda.' }, { status: 403 });
    }

    const updatePayload = {
      ...mapBusinessProfileToSupabaseBusinessUpdate(profile),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update(updatePayload)
      .eq('id', businessId);

    if (updateError) {
      console.error('[Admin Business Profile API] Update failed:', updateError);
      return NextResponse.json({ message: 'Gagal memperbarui profil bisnis.' }, { status: 500 });
    }

    const { data: business, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      console.error('[Admin Business Profile API] Fetch after update failed:', fetchError);
      return NextResponse.json({ message: 'Profil bisnis berhasil diperbarui, tetapi gagal dimuat ulang.' }, { status: 500 });
    }

    return NextResponse.json({
      profile: mapSupabaseBusinessToBusinessProfile(business),
    });
  } catch (error) {
    console.error('[Admin Business Profile API] Failed:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
