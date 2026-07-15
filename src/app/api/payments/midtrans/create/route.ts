import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSnapTransaction, MidtransPaymentMethod, MidtransSnapTransactionPayload } from '@/lib/payments/midtransClient';

export const runtime = 'nodejs';

interface CreateMidtransPaymentBody {
  orderId?: string;
  paymentMethod?: MidtransPaymentMethod;
}

interface OrderItemRow {
  id: string;
  product_id: string | null;
  product_name: string | null;
  name?: string | null;
  price: number;
  quantity: number;
  subtotal?: number | null;
}

interface OrderRow {
  id: string;
  business_id: string;
  queue_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number | null;
  service_charge_amount: number | null;
  tax_amount: number | null;
  delivery_fee_amount: number | null;
  delivery_admin_fee_amount: number | null;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  items?: OrderItemRow[];
}

function normalizeAmount(value: number | string | null | undefined): number {
  return Math.max(0, Math.round(Number(value || 0)));
}

function buildItemDetails(order: OrderRow): NonNullable<MidtransSnapTransactionPayload['item_details']> {
  const grossAmount = normalizeAmount(order.total_amount);
  const items = (order.items || []).map((item) => ({
    id: item.product_id || item.id,
    name: String(item.product_name || item.name || 'Produk').slice(0, 50),
    price: normalizeAmount(item.price),
    quantity: Math.max(1, Number(item.quantity || 1)),
  }));

  const addFeeItem = (id: string, name: string, amount: number | string | null | undefined) => {
    const normalizedAmount = normalizeAmount(amount);
    if (normalizedAmount <= 0) return;
    items.push({
      id,
      name,
      price: normalizedAmount,
      quantity: 1,
    });
  };

  addFeeItem('service-charge', 'Biaya Layanan', order.service_charge_amount);
  addFeeItem('tax', 'Pajak', order.tax_amount);
  addFeeItem('delivery-fee', 'Ongkos Kirim', order.delivery_fee_amount);
  addFeeItem('delivery-admin-fee', 'Biaya Admin Delivery', order.delivery_admin_fee_amount);

  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const adjustment = grossAmount - itemsTotal;

  if (adjustment > 0) {
    items.push({
      id: 'order-adjustment',
      name: 'Penyesuaian Total',
      price: adjustment,
      quantity: 1,
    });
  }

  if (adjustment < 0) {
    throw new Error('Total item Midtrans melebihi gross_amount pesanan.');
  }

  return items;
}

function buildMidtransOrderId(orderId: string): string {
  const safeOrderId = orderId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 32);
  return `UMKM-${safeOrderId}-${Date.now()}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateMidtransPaymentBody;
    const orderId = body.orderId?.trim();
    const paymentMethod = body.paymentMethod;

    if (!orderId) {
      return NextResponse.json({ message: 'Order ID wajib diisi.' }, { status: 400 });
    }

    if (paymentMethod !== 'non_cash') {
      return NextResponse.json({ message: 'Metode pembayaran Midtrans tidak valid.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error('[Midtrans] Failed to load order:', orderError.message);
      return NextResponse.json({ message: 'Gagal memuat pesanan.' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    const typedOrder = order as OrderRow;
    if (typedOrder.payment_status !== 'pending') {
      return NextResponse.json({ message: 'Pembayaran pesanan ini sudah tidak pending.' }, { status: 409 });
    }

    if (typedOrder.payment_method !== 'non_cash') {
      return NextResponse.json({ message: 'Metode pembayaran pesanan tidak sesuai.' }, { status: 400 });
    }

    const midtransOrderId = buildMidtransOrderId(typedOrder.id);
    const grossAmount = normalizeAmount(typedOrder.total_amount);
    const itemDetails = buildItemDetails(typedOrder);
    const itemDetailsTotal = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (itemDetailsTotal !== grossAmount) {
      console.error('[Midtrans] Invalid Snap amount calculation', {
        orderId: typedOrder.id,
        midtransOrderId,
        grossAmount,
        itemDetailsTotal,
      });
      return NextResponse.json({ message: 'Total pembayaran Midtrans tidak valid.' }, { status: 500 });
    }

    const snapPayload: MidtransSnapTransactionPayload = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: typedOrder.customer_name || 'Pelanggan UMKM',
        phone: typedOrder.customer_phone || undefined,
      },
      item_details: itemDetails,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[Midtrans] Snap payload summary', {
        orderId: midtransOrderId,
        grossAmount,
        itemDetailsCount: itemDetails.length,
        enabledPaymentsOmitted: true,
      });
    }

    // Fetch business to get individual midtrans key
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('midtrans_server_key')
      .eq('id', typedOrder.business_id)
      .maybeSingle();

    const customServerKey = business?.midtrans_server_key || undefined;

    // Do not force enabled_payments, payment_type, or channel-specific fields during sandbox testing.
    // Let Snap show all channels enabled in the merchant dashboard Snap Preferences.
    // Re-enable enabled_payments later only after confirming the exact channel names
    // supported by this Midtrans merchant account.
    const snap = await createSnapTransaction(snapPayload, customServerKey);
    const now = new Date().toISOString();
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const { error: insertError } = await supabaseAdmin.from('payments').insert([{
      id: paymentId,
      business_id: typedOrder.business_id,
      order_id: typedOrder.id,
      provider: 'midtrans',
      provider_reference_id: midtransOrderId,
      payment_method: paymentMethod,
      amount: grossAmount,
      status: 'pending',
      snap_token: snap.token,
      snap_redirect_url: snap.redirect_url || null,
      payment_type: null,
      raw_callback_payload: snap,
      created_at: now,
      updated_at: now,
    }]);

    if (insertError) {
      console.error('[Midtrans] Failed to save payment metadata:', insertError.message);
      return NextResponse.json({ message: 'Transaksi Midtrans dibuat, tetapi metadata pembayaran gagal disimpan.' }, { status: 500 });
    }

    return NextResponse.json({
      snapToken: snap.token,
      redirectUrl: snap.redirect_url || null,
      orderId: typedOrder.id,
      paymentId,
    });
  } catch (error) {
    console.error('[Midtrans] Create payment error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { message: 'Pembayaran online sedang tidak tersedia. Silakan pilih Tunai atau hubungi kasir.' },
      { status: 500 }
    );
  }
}
