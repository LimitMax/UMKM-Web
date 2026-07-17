import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateOrderTotals } from '@/utils/calculations';
import { calculateOrderEta } from '@/utils/etaHelpers';
import { mapFrontendPaymentMethodToDb } from '@/utils/statusMapper';

interface CartItem {
  productId: string;
  quantity: number;
}

interface DbProduct {
  id: string;
  business_id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Basic validations
    if (!body.customerName || !body.customerName.trim()) {
      return NextResponse.json({ message: 'Nama lengkap wajib diisi.' }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ message: 'Keranjang belanja kosong.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const requestBusinessId = body.businessId;
    if (!requestBusinessId || typeof requestBusinessId !== 'string') {
      return NextResponse.json({ message: 'Business ID wajib dikirim dari link order bisnis.' }, { status: 400 });
    }

    // 3. Load active products and verify stock levels
    const productMap: Record<string, DbProduct> = {};
    const items = body.items as CartItem[];
    let productBusinessId = '';
    
    for (const item of items) {
      const { data: product, error: prodError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', item.productId)
        .single();

      if (prodError || !product) {
        return NextResponse.json({ message: `Produk dengan ID ${item.productId} tidak ditemukan.` }, { status: 400 });
      }

      if (!product.is_active) {
        return NextResponse.json({ message: `Produk ${product.name} sedang tidak aktif.` }, { status: 400 });
      }

      if (product.stock < item.quantity) {
        return NextResponse.json({ message: 'Stok produk tidak mencukupi.' }, { status: 400 });
      }

      productMap[item.productId] = product as DbProduct;
      
      const currentProdBizId = product.business_id;
      if (!productBusinessId) {
        productBusinessId = currentProdBizId;
      } else if (productBusinessId !== currentProdBizId) {
        return NextResponse.json({ message: 'Semua produk harus berasal dari bisnis yang sama.' }, { status: 400 });
      }
    }

    if (productBusinessId !== requestBusinessId) {
      return NextResponse.json({ message: 'Produk tidak sesuai dengan bisnis pada link order.' }, { status: 400 });
    }

    const finalBusinessId = requestBusinessId;

    // 4. Load business settings
    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', finalBusinessId)
      .eq('public_order_enabled', true)
      .single();

    if (bizError || !business) {
      console.error('Failed to load business profile info:', bizError?.message);
      return NextResponse.json({ message: 'Business ID tidak valid untuk pesanan ini.' }, { status: 400 });
    }

    if (business.status === 'suspended' || business.status === 'archived') {
      return NextResponse.json({ message: 'Toko sedang tidak tersedia.' }, { status: 403 });
    }

    // 4. Calculate subtotal safely from verified database product prices
    const subtotal = items.reduce((sum: number, item: CartItem) => {
      const product = productMap[item.productId];
      return sum + (Number(product.price) * item.quantity);
    }, 0);

    // 5. Compute totals (tax, service charge, delivery fees)
    const totals = calculateOrderTotals({
      subtotal,
      fulfillmentType: body.fulfillmentType || 'dine_in',
      taxEnabled: business.tax_enabled,
      taxPercentage: Number(business.tax_percentage),
      serviceChargeEnabled: business.service_charge_enabled,
      serviceChargePercentage: Number(business.service_charge_percentage),
      deliverySettings: business.delivery_settings,
      deliveryDistanceKm: body.deliveryDistanceKm,
    });

    // 6. Generate queue number (A001, A002 etc. resetting daily)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayOrders, error: queueError } = await supabaseAdmin
      .from('orders')
      .select('queue_number')
      .eq('business_id', finalBusinessId)
      .gte('created_at', todayStart.toISOString());

    if (queueError) {
      console.error('Failed to fetch today orders for queue number:', queueError.message);
      return NextResponse.json({ message: 'Gagal membuat nomor antrean.' }, { status: 500 });
    }

    let nextIndex = 1;
    if (todayOrders && todayOrders.length > 0) {
      const indices = todayOrders.map((o) => {
        const num = parseInt((o.queue_number || '').substring(1), 10);
        return isNaN(num) ? 0 : num;
      });
      nextIndex = Math.max(...indices, 0) + 1;
    }
    const queueNumber = `A${String(nextIndex).padStart(3, '0')}`;

    // 7. Calculate ETA if enabled
    const etaSettings = business.eta_settings;
    const etaResult = etaSettings?.etaEnabled
      ? calculateOrderEta(
          body.fulfillmentType || 'dine_in',
          new Date().toISOString(),
          etaSettings,
          body.deliveryDistanceKm
        )
      : null;

    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    // Generate unique 6-character alphanumeric tracking code (excluding confusing characters: 0, 1, O, I)
    const generateTrackingCode = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let trackingCode = '';
    let isUnique = false;
    let retries = 0;
    const maxRetries = 10;

    while (!isUnique && retries < maxRetries) {
      trackingCode = generateTrackingCode();
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('business_id', finalBusinessId)
        .eq('tracking_code', trackingCode)
        .maybeSingle();

      if (!checkError && !existing) {
        isUnique = true;
      } else {
        retries++;
      }
    }

    if (!isUnique) {
      console.warn('Failed to generate unique tracking code after max retries, using timestamp fallback.');
      trackingCode = generateTrackingCode();
    }

    // 8. Construct database order row
    const orderRow = {
      id: orderId,
      business_id: finalBusinessId,
      queue_number: queueNumber,
      tracking_code: trackingCode,
      customer_name: body.customerName,
      customer_phone: body.customerPhone || '',
      notes: body.notes || '',
      subtotal: totals.subtotal,
      service_charge_amount: totals.serviceChargeAmount,
      tax_amount: totals.taxAmount,
      delivery_fee_amount: totals.deliveryFeeAmount,
      delivery_admin_fee_amount: totals.deliveryAdminFeeAmount,
      free_delivery_applied: totals.freeDeliveryApplied,
      fulfillment_type: body.fulfillmentType || 'dine_in',
      recipient_name: body.fulfillmentType === 'delivery' ? body.recipientName : null,
      delivery_phone: body.fulfillmentType === 'delivery' ? body.deliveryPhone : null,
      delivery_address: body.fulfillmentType === 'delivery' ? body.deliveryAddress : null,
      delivery_notes: body.fulfillmentType === 'delivery' ? body.deliveryNotes : null,
      delivery_distance_km: body.fulfillmentType === 'delivery' ? body.deliveryDistanceKm : 0,
      delivery_fee_calculation_type: body.fulfillmentType === 'delivery' ? (business.delivery_settings?.deliveryFeeCalculationType || 'fixed') : null,
      total_amount: totals.totalAmount,
      payment_method: mapFrontendPaymentMethodToDb(body.paymentMethod),
      payment_status: 'pending',
      order_status: 'pending',
      created_at: createdAt,
      updated_at: createdAt,
      // ETA fields
      ...(etaResult ? {
        estimated_preparation_minutes: etaResult.estimatedPreparationMinutes,
        estimated_delivery_minutes: etaResult.estimatedDeliveryMinutes,
        estimated_total_minutes: etaResult.estimatedTotalMinutes,
        estimated_ready_at: etaResult.estimatedReadyAt,
        estimated_arrival_at: etaResult.estimatedArrivalAt,
        eta_label: etaResult.etaLabel,
        eta_updated_at: etaResult.etaUpdatedAt,
        eta_manually_adjusted: false,
      } : {}),
    };

    // 9. Write to database
    const { error: insertOrderError } = await supabaseAdmin
      .from('orders')
      .insert([orderRow]);

    if (insertOrderError) {
      console.error('Insert order error:', insertOrderError.message);
      return NextResponse.json({ message: 'Gagal membuat pesanan di database.' }, { status: 500 });
    }

    // 10. Construct order items rows
    const orderItemRows = items.map((item: CartItem) => {
      const product = productMap[item.productId];
      const itemPrice = Number(product.price);
      const itemSubtotal = itemPrice * item.quantity;
      const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: itemId,
        order_id: orderId,
        product_id: item.productId,
        product_name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: itemSubtotal,
        created_at: createdAt
      };
    });

    const { error: insertItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemRows);

    if (insertItemsError) {
      console.error('Insert order items error:', insertItemsError.message);
      // Rollback order row
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      return NextResponse.json({ message: 'Gagal menambahkan menu ke antrean pesanan.' }, { status: 500 });
    }

    // 11. Deduct stock levels in Supabase
    for (const item of body.items) {
      const product = productMap[item.productId];
      const { error: updateStockError } = await supabaseAdmin
        .from('products')
        .update({ stock: product.stock - item.quantity, updated_at: new Date().toISOString() })
        .eq('id', item.productId)
        .eq('business_id', finalBusinessId);

      if (updateStockError) {
        console.error(`Failed to update stock for product ${item.productId}:`, updateStockError.message);
      }
    }

    return NextResponse.json({
      success: true,
      id: orderId,
      queueNumber,
      trackingCode
    });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan sistem saat memproses checkout.' }, { status: 500 });
  }
}
