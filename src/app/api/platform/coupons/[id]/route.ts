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

// PATCH /api/platform/coupons/[id] - Toggle status or update coupon
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const body = await request.json();
    const { id } = await params;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }

    if (body.discount_type) {
      if (body.discount_type !== 'percentage' && body.discount_type !== 'fixed') {
        return NextResponse.json({ message: 'Tipe diskon tidak valid.' }, { status: 400 });
      }
      updates.discount_type = body.discount_type;
    }

    if (typeof body.discount_value === 'number') {
      if (body.discount_value <= 0) {
        return NextResponse.json({ message: 'Nilai diskon harus lebih dari 0.' }, { status: 400 });
      }
      updates.discount_value = body.discount_value;
    }

    if (body.hasOwnProperty('max_uses')) {
      updates.max_uses = typeof body.max_uses === 'number' && body.max_uses > 0 ? body.max_uses : null;
    }

    if (body.hasOwnProperty('expires_at')) {
      updates.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;
    }

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ coupon, message: 'Kupon promo berhasil diperbarui.' });
  } catch (error) {
    console.error('[API Platform Coupons PATCH] Error:', error);
    return NextResponse.json({ message: 'Gagal memperbarui kupon promo.' }, { status: 500 });
  }
}

// DELETE /api/platform/coupons/[id] - Delete a coupon
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Kupon promo berhasil dihapus.' });
  } catch (error) {
    console.error('[API Platform Coupons DELETE] Error:', error);
    return NextResponse.json({ message: 'Gagal menghapus kupon promo.' }, { status: 500 });
  }
}
