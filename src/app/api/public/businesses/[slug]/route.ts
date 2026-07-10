import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  props: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const resolvedParams = 'then' in props.params ? await props.params : props.params;
  const slug = resolvedParams.slug;

  if (!slug) {
    return NextResponse.json({ message: 'Slug bisnis tidak valid.' }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select(`
      id,
      name,
      business_type,
      slug,
      public_order_enabled,
      description,
      logo_url,
      address,
      whatsapp_number,
      opening_hours,
      currency,
      tax_enabled,
      tax_percentage,
      service_charge_enabled,
      service_charge_percentage,
      delivery_settings,
      eta_settings,
      plan_code,
      subscription_status
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ message: 'Bisnis tidak ditemukan.' }, { status: 404 });
  }

  if (data.public_order_enabled === false) {
    return NextResponse.json({ message: 'Menu online toko ini sedang dinonaktifkan.' }, { status: 403 });
  }

  return NextResponse.json({ business: data });
}
