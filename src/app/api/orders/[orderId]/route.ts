import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  props: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const resolvedParams = 'then' in props.params ? await props.params : props.params;
    const { orderId } = resolvedParams;

    if (!orderId) {
      return NextResponse.json({ message: 'Order ID tidak valid.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // 1. Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error(`API GET Order ${orderId} error:`, orderError?.message);
      return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    // 2. Fetch order items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error(`API GET Order ${orderId} items error:`, itemsError.message);
      // Return order header with item error details separately
      return NextResponse.json({
        ...order,
        items: [],
        items_error: 'Gagal memuat rincian item pesanan.'
      });
    }

    // 3. Return combined order details safely
    return NextResponse.json({
      ...order,
      items
    });
  } catch (error) {
    console.error('API GET Order exception:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
