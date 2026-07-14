import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  mapProductToSupabaseInsert,
  mapProductToSupabaseUpdate,
  mapSupabaseProductToProduct,
} from '@/lib/data/mappers';
import type { Product } from '@/types';

export const runtime = 'nodejs';

interface ProductRequestBody {
  businessId?: string;
  productId?: string;
  product?: Omit<Product, 'id'> | Partial<Omit<Product, 'id'>>;
}

async function verifyAdminBusinessAccess(request: Request, businessId: string) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      error: NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 }),
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      error: NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 }),
    };
  }

  const { data: authProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, business_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !authProfile) {
    return {
      error: NextResponse.json({ message: 'Profil pengguna tidak ditemukan.' }, { status: 403 }),
    };
  }

  if (authProfile.role !== 'admin') {
    return {
      error: NextResponse.json({ message: 'Hanya admin yang dapat mengelola produk.' }, { status: 403 }),
    };
  }

  if (authProfile.business_id !== businessId) {
    return {
      error: NextResponse.json({ message: 'Business ID tidak sesuai dengan akun Anda.' }, { status: 403 }),
    };
  }

  return { supabaseAdmin };
}

function parseBusinessId(body: ProductRequestBody | null) {
  return typeof body?.businessId === 'string' ? body.businessId.trim() : '';
}

function parseProductId(body: ProductRequestBody | null) {
  return typeof body?.productId === 'string' ? body.productId.trim() : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ProductRequestBody | null;
    const businessId = parseBusinessId(body);
    const product = body?.product as Omit<Product, 'id'> | undefined;

    if (!businessId || !product?.name) {
      return NextResponse.json({ message: 'Payload produk tidak valid.' }, { status: 400 });
    }

    const authResult = await verifyAdminBusinessAccess(request, businessId);
    if (authResult.error) return authResult.error;

    const insertPayload = mapProductToSupabaseInsert(product, businessId);
    const { data, error } = await authResult.supabaseAdmin!
      .from('products')
      .insert([insertPayload])
      .select('*')
      .single();

    if (error) {
      console.error('[Admin Products API] Create failed:', error);
      return NextResponse.json({ message: 'Gagal menambahkan produk.' }, { status: 500 });
    }

    return NextResponse.json({ product: mapSupabaseProductToProduct(data) });
  } catch (error) {
    console.error('[Admin Products API] Create failed:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ProductRequestBody | null;
    const businessId = parseBusinessId(body);
    const productId = parseProductId(body);
    const product = body?.product as Partial<Omit<Product, 'id'>> | undefined;

    if (!businessId || !productId || !product) {
      return NextResponse.json({ message: 'Payload produk tidak valid.' }, { status: 400 });
    }

    const authResult = await verifyAdminBusinessAccess(request, businessId);
    if (authResult.error) return authResult.error;

    const updatePayload = {
      ...mapProductToSupabaseUpdate(product),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await authResult.supabaseAdmin!
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .eq('business_id', businessId)
      .select('*')
      .single();

    if (error) {
      console.error('[Admin Products API] Update failed:', error);
      return NextResponse.json({ message: 'Gagal memperbarui produk.' }, { status: 500 });
    }

    return NextResponse.json({ product: mapSupabaseProductToProduct(data) });
  } catch (error) {
    console.error('[Admin Products API] Update failed:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ProductRequestBody | null;
    const businessId = parseBusinessId(body);
    const productId = parseProductId(body);

    if (!businessId || !productId) {
      return NextResponse.json({ message: 'Payload produk tidak valid.' }, { status: 400 });
    }

    const authResult = await verifyAdminBusinessAccess(request, businessId);
    if (authResult.error) return authResult.error;

    const { error } = await authResult.supabaseAdmin!
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('business_id', businessId);

    if (error) {
      console.error('[Admin Products API] Delete failed:', error);
      return NextResponse.json({ message: 'Gagal menghapus produk.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Admin Products API] Delete failed:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
