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

    // 2.5. Fetch payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', orderId);

    if (paymentsError) {
      console.error(`API GET Order ${orderId} payments error:`, paymentsError.message);
    }

    // 3. Return combined order details safely
    return NextResponse.json({
      ...order,
      items,
      payments: payments || []
    });
  } catch (error) {
    console.error('API GET Order exception:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const resolvedParams = 'then' in props.params ? await props.params : props.params;
    const { orderId } = resolvedParams;

    if (!orderId) {
      return NextResponse.json({ message: 'Order ID tidak valid.' }, { status: 400 });
    }

    const { paymentMethod } = await request.json();
    if (paymentMethod !== 'Cash' && paymentMethod !== 'Non-Cash') {
      return NextResponse.json({ message: 'Metode pembayaran tidak valid.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // 1. Fetch order to verify its current status
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('payment_status, order_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    // Only allow if order is still waiting for payment
    if (order.payment_status === 'paid' || order.order_status === 'completed' || order.order_status === 'cancelled') {
      return NextResponse.json({ message: 'Metode pembayaran tidak dapat diubah karena pesanan sudah diproses atau dibayar.' }, { status: 400 });
    }

    const dbPaymentMethod = paymentMethod === 'Cash' ? 'cash' : 'non_cash';

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_method: dbPaymentMethod,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update order payment method:', updateError.message);
      return NextResponse.json({ message: 'Gagal memperbarui metode pembayaran.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order: updatedOrder });
  } catch (error) {
    console.error('API PATCH Order exception:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
