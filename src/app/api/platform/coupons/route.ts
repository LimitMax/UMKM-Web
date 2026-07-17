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

// GET: List all coupons
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const { data: coupons, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ coupons: coupons || [] });
  } catch (error) {
    console.error('[API Platform Coupons GET] Error:', error);
    return NextResponse.json({ message: 'Gagal memuat daftar kupon.' }, { status: 500 });
  }
}

// POST: Create a new coupon
export async function POST(request: Request) {
  try {
    const authResult = await verifyPlatformOwner(request);
    if (authResult.error) return authResult.error;

    const { supabaseAdmin } = authResult;
    const body = await request.json();

    const {
      code,
      discount_type,
      discount_value,
      max_uses,
      expires_at,
      is_active,
    } = body;

    if (!discount_type || typeof discount_value !== 'number' || discount_value <= 0) {
      return NextResponse.json({ message: 'Tipe diskon dan nilai diskon wajib diisi dan harus valid.' }, { status: 400 });
    }

    if (discount_type !== 'percentage' && discount_type !== 'fixed') {
      return NextResponse.json({ message: 'Tipe diskon harus berupa percentage atau fixed.' }, { status: 400 });
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return NextResponse.json({ message: 'Nilai persentase diskon tidak boleh lebih dari 100%.' }, { status: 400 });
    }

    let couponCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!couponCode) {
      // Auto-generate code if empty
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      couponCode = `PROMO${randomPart}`;
    }

    // Verify code is unique
    const { data: existing } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .eq('code', couponCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: `Kode kupon ${couponCode} sudah digunakan. Silakan gunakan kode lain.` }, { status: 400 });
    }

    const newCoupon = {
      code: couponCode,
      discount_type,
      discount_value,
      max_uses: typeof max_uses === 'number' && max_uses > 0 ? max_uses : null,
      used_count: 0,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert([newCoupon])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ coupon: data, message: 'Kupon promo berhasil dibuat.' });
  } catch (error) {
    console.error('[API Platform Coupons POST] Error:', error);
    return NextResponse.json({ message: 'Gagal membuat kupon promo.' }, { status: 500 });
  }
}
