import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function verifyAdmin(request: Request) {
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

  if (!profile.business_id) {
    return { error: NextResponse.json({ message: 'Akun Anda tidak terhubung dengan bisnis apapun.' }, { status: 400 }) };
  }

  return { supabaseAdmin, businessId: profile.business_id };
}

// GET all business vouchers
export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    const { data: vouchers, error } = await auth.supabaseAdmin!
      .from('business_vouchers')
      .select('*')
      .eq('business_id', auth.businessId!)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Vouchers GET] Fetch failed:', error);
      return NextResponse.json({ message: 'Gagal memuat daftar voucher.' }, { status: 500 });
    }

    return NextResponse.json({ vouchers });
  } catch (error) {
    console.error('[Admin Vouchers GET] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new business voucher
export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const discountType = typeof body?.discount_type === 'string' ? body.discount_type.trim() : '';
    const discountValue = typeof body?.discount_value === 'number' ? body.discount_value : null;
    const minOrderAmount = typeof body?.min_order_amount === 'number' ? body.min_order_amount : 0;
    const maxDiscount = typeof body?.max_discount === 'number' ? body.max_discount : null;
    const startDate = typeof body?.start_date === 'string' ? body.start_date.trim() : '';
    const endDate = typeof body?.end_date === 'string' ? body.end_date.trim() : '';
    const usageLimit = typeof body?.usage_limit === 'number' ? body.usage_limit : null;
    const isActive = typeof body?.is_active === 'boolean' ? body.is_active : true;

    if (!code || !name || !discountType || discountValue === null || !startDate || !endDate) {
      return NextResponse.json({ message: 'Formulir data voucher tidak lengkap.' }, { status: 400 });
    }

    if (discountType !== 'percentage' && discountType !== 'fixed') {
      return NextResponse.json({ message: 'Tipe diskon harus persentase atau nominal tetap.' }, { status: 400 });
    }

    if (discountValue <= 0) {
      return NextResponse.json({ message: 'Nilai diskon harus lebih besar dari 0.' }, { status: 400 });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json({ message: 'Nilai diskon persentase tidak boleh lebih dari 100%.' }, { status: 400 });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ message: 'Tanggal berakhir tidak boleh mendahului tanggal mulai.' }, { status: 400 });
    }

    // Check code duplication for this business
    const { data: existingVoucher } = await auth.supabaseAdmin!
      .from('business_vouchers')
      .select('id')
      .eq('business_id', auth.businessId!)
      .eq('code', code)
      .maybeSingle();

    if (existingVoucher) {
      return NextResponse.json({ message: `Kode voucher ${code} sudah terdaftar di toko Anda.` }, { status: 400 });
    }

    const { data, error } = await auth.supabaseAdmin!
      .from('business_vouchers')
      .insert([{
        business_id: auth.businessId!,
        code,
        name,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_amount: minOrderAmount,
        max_discount: maxDiscount,
        start_date: startDate,
        end_date: endDate,
        usage_limit: usageLimit,
        is_active: isActive
      }])
      .select('*')
      .single();

    if (error) {
      console.error('[Admin Vouchers POST] Insert failed:', error);
      return NextResponse.json({ message: 'Gagal menambahkan voucher baru.' }, { status: 500 });
    }

    return NextResponse.json({ voucher: data, message: 'Voucher berhasil dibuat!' });
  } catch (error) {
    console.error('[Admin Vouchers POST] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
