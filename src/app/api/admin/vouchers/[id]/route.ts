import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function verifyAdminAndVoucherOwnership(request: Request, voucherId: string) {
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
    .select('role, business_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: NextResponse.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 403 }) };
  }

  if (profile.role !== 'admin') {
    return { error: NextResponse.json({ message: 'Akses ditolak. Hanya owner/admin yang dapat mengelola voucher.' }, { status: 403 }) };
  }

  // Fetch the voucher to check ownership
  const { data: voucher, error: voucherError } = await supabaseAdmin
    .from('business_vouchers')
    .select('*')
    .eq('id', voucherId)
    .maybeSingle();

  if (voucherError || !voucher) {
    return { error: NextResponse.json({ message: 'Voucher tidak ditemukan.' }, { status: 444 }) };
  }

  if (voucher.business_id !== profile.business_id) {
    return { error: NextResponse.json({ message: 'Anda tidak memiliki hak akses untuk voucher ini.' }, { status: 403 }) };
  }

  return { supabaseAdmin, businessId: profile.business_id, voucher };
}

// PATCH to toggle active status or update voucher
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = params.id;
    const auth = await verifyAdminAndVoucherOwnership(request, id);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    
    // We only support updating specific fields like is_active for simplicity
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (typeof body?.is_active === 'boolean') {
      updatePayload.is_active = body.is_active;
    }

    const { data: updatedVoucher, error } = await auth.supabaseAdmin!
      .from('business_vouchers')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Admin Vouchers PATCH] Update failed:', error);
      return NextResponse.json({ message: 'Gagal memperbarui status voucher.' }, { status: 500 });
    }

    return NextResponse.json({ voucher: updatedVoucher, message: 'Voucher berhasil diperbarui.' });
  } catch (error) {
    console.error('[Admin Vouchers PATCH] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a business voucher
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = params.id;
    const auth = await verifyAdminAndVoucherOwnership(request, id);
    if (auth.error) return auth.error;

    const { error } = await auth.supabaseAdmin!
      .from('business_vouchers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Vouchers DELETE] Delete failed:', error);
      return NextResponse.json({ message: 'Gagal menghapus voucher.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Voucher berhasil dihapus.' });
  } catch (error) {
    console.error('[Admin Vouchers DELETE] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
