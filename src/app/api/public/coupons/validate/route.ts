import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

interface ValidateCouponBody {
  code?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ValidateCouponBody | null;
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';

    if (!code) {
      return NextResponse.json({ valid: false, message: 'Kode kupon wajib diisi.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('code, discount_type, discount_value, is_active')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ valid: false, message: 'Gagal memvalidasi kupon.' }, { status: 500 });
    }

    if (!coupon) {
      return NextResponse.json({ valid: false, message: 'Kode kupon tidak terdaftar.' }, { status: 404 });
    }

    if (!coupon.is_active) {
      return NextResponse.json({ valid: false, message: 'Kode kupon sudah tidak aktif.' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
      },
    });
  } catch (error) {
    console.error('[Public Coupon Validation API] Exception:', error);
    return NextResponse.json({ valid: false, message: 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
