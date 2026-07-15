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

  const DEVELOPER_EMAILS = (process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || '')
    .split(',')
    .map((em) => em.trim().toLowerCase())
    .filter(Boolean);

  const isDeveloper = userData.user.email && DEVELOPER_EMAILS.includes(userData.user.email.toLowerCase());

  if (!isDeveloper) {
    return { error: NextResponse.json({ message: 'Akses terbatas untuk Pemilik Platform saja.' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

// GET all coupons
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { data: coupons, error } = await authResult.supabaseAdmin!
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ message: 'Gagal memuat kupon.' }, { status: 500 });
    }

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('[Admin Coupons GET API] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to create a coupon
export async function POST(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const body = await request.json().catch(() => null);
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    const discountType = typeof body?.discountType === 'string' ? body.discountType.trim() : '';
    const discountValue = typeof body?.discountValue === 'number' ? Math.max(1, body.discountValue) : null;

    if (!code || !discountType || discountValue === null) {
      return NextResponse.json({ message: 'Payload kupon tidak lengkap atau tidak valid.' }, { status: 400 });
    }

    if (discountType !== 'percentage' && discountType !== 'fixed') {
      return NextResponse.json({ message: 'Tipe diskon harus percentage atau fixed.' }, { status: 400 });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json({ message: 'Diskon persentase tidak boleh lebih dari 100%.' }, { status: 400 });
    }

    const { data: existingCoupon } = await authResult.supabaseAdmin!
      .from('coupons')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existingCoupon) {
      return NextResponse.json({ message: 'Kode kupon sudah terdaftar.' }, { status: 400 });
    }

    const { data, error } = await authResult.supabaseAdmin!
      .from('coupons')
      .insert([{
        code,
        discount_type: discountType,
        discount_value: discountValue,
        is_active: true,
      }])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ message: 'Gagal menambahkan kupon baru.' }, { status: 500 });
    }

    return NextResponse.json({ coupon: data });
  } catch (error) {
    console.error('[Admin Coupons POST API] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a coupon
export async function DELETE(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();

    if (!id) {
      return NextResponse.json({ message: 'ID kupon wajib dicantumkan.' }, { status: 400 });
    }

    const { error } = await authResult.supabaseAdmin!
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ message: 'Gagal menghapus kupon.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Kupon berhasil dihapus.' });
  } catch (error) {
    console.error('[Admin Coupons DELETE API] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
