import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const businessId = typeof body?.businessId === 'string' ? body.businessId.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    const subtotal = typeof body?.subtotal === 'number' ? body.subtotal : null;

    if (!businessId || !code || subtotal === null) {
      return NextResponse.json({ valid: false, message: 'Payload tidak lengkap.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Query voucher details
    const { data: voucher, error } = await supabaseAdmin
      .from('business_vouchers')
      .select('*')
      .eq('business_id', businessId)
      .eq('code', code)
      .maybeSingle();

    if (error || !voucher) {
      return NextResponse.json({ valid: false, message: 'Kode voucher tidak valid.' }, { status: 400 });
    }

    // 1. Check is active
    if (!voucher.is_active) {
      return NextResponse.json({ valid: false, message: 'Voucher sedang tidak aktif.' }, { status: 400 });
    }

    // 2. Check date validity
    const now = new Date();
    const startDate = new Date(voucher.start_date);
    const endDate = new Date(voucher.end_date);

    if (now < startDate) {
      return NextResponse.json({ valid: false, message: 'Voucher belum dapat digunakan.' }, { status: 400 });
    }

    if (now > endDate) {
      return NextResponse.json({ valid: false, message: 'Masa berlaku voucher telah habis.' }, { status: 400 });
    }

    // 3. Check minimum order amount
    if (subtotal < Number(voucher.min_order_amount)) {
      return NextResponse.json({ 
        valid: false, 
        message: `Min. pembelian untuk voucher ini adalah ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(voucher.min_order_amount)}.` 
      }, { status: 400 });
    }

    // 4. Check usage limit
    if (voucher.usage_limit !== null && voucher.used_count >= voucher.usage_limit) {
      return NextResponse.json({ valid: false, message: 'Kuota penggunaan voucher telah habis.' }, { status: 400 });
    }

    // 5. Calculate discount amount
    let discountAmount = 0;
    if (voucher.discount_type === 'percentage') {
      const calculated = Math.round(subtotal * (Number(voucher.discount_value) / 100));
      discountAmount = voucher.max_discount ? Math.min(Number(voucher.max_discount), calculated) : calculated;
    } else if (voucher.discount_type === 'fixed') {
      discountAmount = Number(voucher.discount_value);
    }

    // Discount cannot exceed subtotal
    discountAmount = Math.min(subtotal, discountAmount);

    return NextResponse.json({
      valid: true,
      voucherId: voucher.id,
      code: voucher.code,
      name: voucher.name,
      discountType: voucher.discount_type,
      discountValue: Number(voucher.discount_value),
      discountAmount,
      minOrderAmount: Number(voucher.min_order_amount),
      maxDiscount: voucher.max_discount ? Number(voucher.max_discount) : null
    });
  } catch (error) {
    console.error('[Public Voucher Validate API] Error:', error);
    return NextResponse.json({ valid: false, message: 'Terjadi kesalahan sistem saat validasi.' }, { status: 500 });
  }
}
