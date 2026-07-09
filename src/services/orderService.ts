import { Order, OrderStatus, PaymentStatus, OrderItem } from '../types';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './db';
import { productService } from './productService';
import { supabase } from '../lib/supabase';
import { businessService } from './businessService';
import { calculateOrderTotals } from '../utils/calculations';
import { calculateOrderEta, applyEtaAdjustment } from '../utils/etaHelpers';
const USE_SUPABASE = false; // Force localStorage for orders in Phase 7C

interface DbOrderItem {
  product_id: string;
  name: string;
  price: string | number;
  quantity: number;
}

interface DbOrder {
  id: string;
  queue_number: string;
  customer_name: string;
  customer_phone: string;
  notes?: string | null;
  subtotal?: string | number | null;
  service_charge_amount?: string | number | null;
  tax_amount?: string | number | null;
  total_amount: string | number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  fulfillment_type?: string | null;
  recipient_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_notes?: string | null;
  delivery_fee_amount?: string | number | null;
  delivery_admin_fee_amount?: string | number | null;
  free_delivery_applied?: boolean | null;
  delivery_distance_km?: string | number | null;
  delivery_distance_source?: string | null;
  delivery_fee_calculation_type?: string | null;
  estimated_preparation_minutes?: number | null;
  estimated_delivery_minutes?: number | null;
  estimated_total_minutes?: number | null;
  estimated_ready_at?: string | null;
  estimated_arrival_at?: string | null;
  eta_label?: string | null;
  eta_updated_at?: string | null;
  eta_manually_adjusted?: boolean | null;
  eta_adjustment_reason?: string | null;
  items?: DbOrderItem[] | null;
}

function mapDbOrderToOrder(dbOrder: DbOrder): Order {
  if (!dbOrder) return dbOrder;
  return {
    id: dbOrder.id,
    queueNumber: dbOrder.queue_number,
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone,
    notes: dbOrder.notes || undefined,
    subtotal: dbOrder.subtotal !== null && dbOrder.subtotal !== undefined ? Number(dbOrder.subtotal) : undefined,
    serviceChargeAmount: dbOrder.service_charge_amount !== null && dbOrder.service_charge_amount !== undefined ? Number(dbOrder.service_charge_amount) : undefined,
    taxAmount: dbOrder.tax_amount !== null && dbOrder.tax_amount !== undefined ? Number(dbOrder.tax_amount) : undefined,
    totalAmount: Number(dbOrder.total_amount),
    paymentMethod: dbOrder.payment_method as Order['paymentMethod'],
    paymentStatus: dbOrder.payment_status as Order['paymentStatus'],
    status: dbOrder.status as Order['status'],
    createdAt: dbOrder.created_at,
    fulfillmentType: (dbOrder.fulfillment_type || 'dine_in') as Order['fulfillmentType'],
    recipientName: dbOrder.recipient_name || undefined,
    deliveryPhone: dbOrder.delivery_phone || undefined,
    deliveryAddress: dbOrder.delivery_address || undefined,
    deliveryNotes: dbOrder.delivery_notes || undefined,
    deliveryFeeAmount: dbOrder.delivery_fee_amount !== null && dbOrder.delivery_fee_amount !== undefined ? Number(dbOrder.delivery_fee_amount) : undefined,
    deliveryAdminFeeAmount: dbOrder.delivery_admin_fee_amount !== null && dbOrder.delivery_admin_fee_amount !== undefined ? Number(dbOrder.delivery_admin_fee_amount) : undefined,
    freeDeliveryApplied: dbOrder.free_delivery_applied !== null && dbOrder.free_delivery_applied !== undefined ? dbOrder.free_delivery_applied : undefined,
    deliveryDistanceKm: dbOrder.delivery_distance_km !== null && dbOrder.delivery_distance_km !== undefined ? Number(dbOrder.delivery_distance_km) : undefined,
    deliveryDistanceSource: dbOrder.delivery_distance_source || undefined,
    deliveryFeeCalculationType: (dbOrder.delivery_fee_calculation_type || undefined) as Order['deliveryFeeCalculationType'],
    // Phase 6.8 ETA fields
    estimatedPreparationMinutes: dbOrder.estimated_preparation_minutes !== null && dbOrder.estimated_preparation_minutes !== undefined ? dbOrder.estimated_preparation_minutes : undefined,
    estimatedDeliveryMinutes: dbOrder.estimated_delivery_minutes !== null && dbOrder.estimated_delivery_minutes !== undefined ? dbOrder.estimated_delivery_minutes : undefined,
    estimatedTotalMinutes: dbOrder.estimated_total_minutes !== null && dbOrder.estimated_total_minutes !== undefined ? dbOrder.estimated_total_minutes : undefined,
    estimatedReadyAt: dbOrder.estimated_ready_at || undefined,
    estimatedArrivalAt: dbOrder.estimated_arrival_at || undefined,
    etaLabel: dbOrder.eta_label || undefined,
    etaUpdatedAt: dbOrder.eta_updated_at || undefined,
    etaManuallyAdjusted: dbOrder.eta_manually_adjusted !== null && dbOrder.eta_manually_adjusted !== undefined ? dbOrder.eta_manually_adjusted : false,
    etaAdjustmentReason: dbOrder.eta_adjustment_reason || undefined,
    items: (dbOrder.items || []).map((item: DbOrderItem) => ({
      productId: item.product_id,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity
    }))
  };
}

export const orderService = {
  async getOrders(): Promise<Order[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getOrders error:', error.message);
        throw error;
      }
      return (data || []).map(mapDbOrderToOrder);
    }

    return getStorageItem<Order[]>(STORAGE_KEYS.ORDERS, []);
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', id)
        .single();
      if (error) {
        console.error('Supabase getOrderById error:', error.message);
        return undefined;
      }
      return data ? mapDbOrderToOrder(data) : undefined;
    }

    return (await this.getOrders()).find((o) => o.id === id);
  },

  // Generates next queue number (e.g. A001, A002) resetting daily
  async generateQueueNumber(): Promise<string> {
    const orders = await this.getOrders();
    const today = new Date().toDateString();
    
    // Filter all orders created today
    const todayOrders = orders.filter(
      (o) => new Date(o.createdAt).toDateString() === today
    );
    
    let nextIndex = 1;
    if (todayOrders.length > 0) {
      // Find the maximum queue number index from today's orders
      const indices = todayOrders.map((o) => {
        const num = parseInt(o.queueNumber.substring(1), 10);
        return isNaN(num) ? 0 : num;
      });
      nextIndex = Math.max(...indices, 0) + 1;
    }
    
    return `A${String(nextIndex).padStart(3, '0')}`;
  },

  async createOrder(orderData: {
    customerName: string;
    customerPhone: string;
    notes?: string;
    items: OrderItem[];
    paymentMethod: Order['paymentMethod'];
    fulfillmentType?: Order['fulfillmentType'];
    recipientName?: string;
    deliveryPhone?: string;
    deliveryAddress?: string;
    deliveryNotes?: string;
    deliveryDistanceKm?: number;
    deliveryDistanceSource?: string;
    deliveryFeeCalculationType?: Order['deliveryFeeCalculationType'];
  }): Promise<Order> {
    // 1. Validate customer name
    if (!orderData.customerName.trim()) {
      throw new Error('Nama pelanggan wajib diisi.');
    }

    // 2. Validate cart items and stocks
    if (orderData.items.length === 0) {
      throw new Error('Keranjang belanja kosong.');
    }

    // Double check stock check
    for (const item of orderData.items) {
      const prod = await productService.getProductById(item.productId);
      if (!prod) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      }
      if (prod.stock < item.quantity) {
        throw new Error(`Stok untuk ${prod.name} tidak mencukupi (Tersisa: ${prod.stock}).`);
      }
    }

    // 3. Calculate subtotal, tax, service charge, and total amount
    const profile = await businessService.getProfile();
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const totals = calculateOrderTotals({
      subtotal,
      fulfillmentType: orderData.fulfillmentType || 'dine_in',
      taxEnabled: profile.taxEnabled,
      taxPercentage: profile.taxPercentage,
      serviceChargeEnabled: profile.serviceChargeEnabled,
      serviceChargePercentage: profile.serviceChargePercentage,
      deliverySettings: profile.deliverySettings,
      deliveryDistanceKm: orderData.deliveryDistanceKm,
    });

    // 4. Generate queue number and order ID
    const queueNumber = await this.generateQueueNumber();

    // 5. Deduct product stocks
    for (const item of orderData.items) {
      await productService.adjustStock(item.productId, -item.quantity);
    }

    const createdAt = new Date().toISOString();

    if (USE_SUPABASE) {
      // Calculate ETA if enabled
      const etaSettings = profile.etaSettings;
      const etaResult = etaSettings?.etaEnabled
        ? calculateOrderEta(
            orderData.fulfillmentType || 'dine_in',
            createdAt,
            etaSettings,
            orderData.deliveryDistanceKm
          )
        : null;

      // Insert order into Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          queue_number: queueNumber,
          customer_name: orderData.customerName,
          customer_phone: orderData.customerPhone,
          notes: orderData.notes,
          subtotal: totals.subtotal,
          service_charge_amount: totals.serviceChargeAmount,
          tax_amount: totals.taxAmount,
          delivery_fee_amount: totals.deliveryFeeAmount,
          delivery_admin_fee_amount: totals.deliveryAdminFeeAmount,
          free_delivery_applied: totals.freeDeliveryApplied,
          fulfillment_type: orderData.fulfillmentType || 'dine_in',
          recipient_name: orderData.recipientName,
          delivery_phone: orderData.deliveryPhone,
          delivery_address: orderData.deliveryAddress,
          delivery_notes: orderData.deliveryNotes,
          total_amount: totals.totalAmount,
          payment_method: orderData.paymentMethod,
          payment_status: 'Waiting for Payment',
          status: 'Waiting for Payment',
          created_at: createdAt,
          // Phase 6.8 — ETA fields
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
        }])
        .select()
        .single();
      
      if (orderError) {
        console.error('Supabase createOrder error:', orderError.message);
        throw orderError;
      }

      // Insert order items
      const dbItems = orderData.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(dbItems);

      if (itemsError) {
        console.error('Supabase createOrder items error:', itemsError.message);
        throw itemsError;
      }

      return mapDbOrderToOrder({
        ...(order as unknown as DbOrder),
        items: dbItems
      });
    }

    // Local Storage driver branch
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const orders = await this.getOrders();


    // Calculate ETA if enabled
    const etaSettings = profile.etaSettings;
    const etaResult = etaSettings?.etaEnabled
      ? calculateOrderEta(
          orderData.fulfillmentType || 'dine_in',
          createdAt,
          etaSettings,
          orderData.deliveryDistanceKm
        )
      : null;

    const newOrder: Order = {
      id: orderId,
      queueNumber,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      notes: orderData.notes,
      items: orderData.items,
      subtotal: totals.subtotal,
      serviceChargeAmount: totals.serviceChargeAmount,
      taxAmount: totals.taxAmount,
      deliveryFeeAmount: totals.deliveryFeeAmount,
      deliveryAdminFeeAmount: totals.deliveryAdminFeeAmount,
      freeDeliveryApplied: totals.freeDeliveryApplied,
      totalAmount: totals.totalAmount,
      fulfillmentType: orderData.fulfillmentType || 'dine_in',
      recipientName: orderData.recipientName,
      deliveryPhone: orderData.deliveryPhone,
      deliveryAddress: orderData.deliveryAddress,
      deliveryNotes: orderData.deliveryNotes,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'Waiting for Payment',
      status: 'Waiting for Payment',
      createdAt,
      deliveryDistanceKm: orderData.deliveryDistanceKm,
      deliveryDistanceSource: orderData.deliveryDistanceSource,
      deliveryFeeCalculationType: orderData.deliveryFeeCalculationType,
      // Phase 6.8 — ETA fields
      ...(etaResult ? {
        estimatedPreparationMinutes: etaResult.estimatedPreparationMinutes,
        estimatedDeliveryMinutes: etaResult.estimatedDeliveryMinutes,
        estimatedTotalMinutes: etaResult.estimatedTotalMinutes,
        estimatedReadyAt: etaResult.estimatedReadyAt,
        estimatedArrivalAt: etaResult.estimatedArrivalAt,
        etaLabel: etaResult.etaLabel,
        etaUpdatedAt: etaResult.etaUpdatedAt,
        etaManuallyAdjusted: false,
      } : {}),
    };

    orders.push(newOrder);
    setStorageItem(STORAGE_KEYS.ORDERS, orders);

    return newOrder;
  },

  async updateOrderStatus(id: string, status: OrderStatus, paymentStatus?: PaymentStatus): Promise<Order> {
    if (USE_SUPABASE) {
      const currentOrder = await this.getOrderById(id);
      if (!currentOrder) {
        throw new Error(`Order with ID ${id} not found.`);
      }

      // 1. If order transitions to Cancelled, return stock to inventory
      if (status === 'Cancelled' && currentOrder.status !== 'Cancelled') {
        for (const item of currentOrder.items) {
          await productService.adjustStock(item.productId, item.quantity);
        }
      }

      // 2. If order was Cancelled and is restored (transitioning away from Cancelled)
      if (currentOrder.status === 'Cancelled' && status !== 'Cancelled') {
        // Check if stock is sufficient first
        for (const item of currentOrder.items) {
          const prod = await productService.getProductById(item.productId);
          if (!prod) {
            throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
          }
          if (prod.stock < item.quantity) {
            throw new Error(`Gagal memulihkan pesanan. Stok untuk ${prod.name} tidak mencukupi (Tersisa: ${prod.stock}).`);
          }
        }
        // Re-deduct stock
        for (const item of currentOrder.items) {
          await productService.adjustStock(item.productId, -item.quantity);
        }
      }

      let derivedPaymentStatus = paymentStatus || currentOrder.paymentStatus;
      if ((status === 'Paid' || status === 'Processing' || status === 'Ready' || status === 'delivering' || status === 'Completed') && derivedPaymentStatus === 'Waiting for Payment') {
        derivedPaymentStatus = 'Paid';
      }

      const { data: order, error } = await supabase
        .from('orders')
        .update({
          status,
          payment_status: derivedPaymentStatus
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase updateOrderStatus error:', error.message);
        throw error;
      }

      // Create invoice/transaction record if completed
      if (status === 'Completed' && currentOrder.status !== 'Completed') {
        const { error: txError } = await supabase
          .from('transactions')
          .insert([{
            order_id: id,
            amount: currentOrder.totalAmount,
            payment_method: currentOrder.paymentMethod
          }]);
        if (txError) {
          console.error('Supabase insert transaction error:', txError.message);
        }
      }

      return {
        ...currentOrder,
        status: order.status,
        paymentStatus: order.payment_status
      };
    }

    // Local Storage driver branch
    const orders = await this.getOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new Error(`Order with ID ${id} not found.`);
    }

    const currentOrder = orders[index];
    
    // 1. If order transitions to Cancelled, return stock to inventory
    if (status === 'Cancelled' && currentOrder.status !== 'Cancelled') {
      for (const item of currentOrder.items) {
        await productService.adjustStock(item.productId, item.quantity);
      }
    }

    // 2. If order was Cancelled and is restored (transitioning away from Cancelled)
    if (currentOrder.status === 'Cancelled' && status !== 'Cancelled') {
      // Check if stock is sufficient first
      for (const item of currentOrder.items) {
        const prod = await productService.getProductById(item.productId);
        if (!prod) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }
        if (prod.stock < item.quantity) {
          throw new Error(`Gagal memulihkan pesanan. Stok untuk ${prod.name} tidak mencukupi (Tersisa: ${prod.stock}).`);
        }
      }
      // Re-deduct stock
      for (const item of currentOrder.items) {
        await productService.adjustStock(item.productId, -item.quantity);
      }
    }

    const updatedOrder: Order = {
      ...currentOrder,
      status,
      paymentStatus: paymentStatus || currentOrder.paymentStatus,
    };

    // Auto-update payment status to Paid if the status becomes Completed, Paid, or delivering
    if ((status === 'Paid' || status === 'Processing' || status === 'Ready' || status === 'delivering' || status === 'Completed') && updatedOrder.paymentStatus === 'Waiting for Payment') {
      updatedOrder.paymentStatus = 'Paid';
    }

    orders[index] = updatedOrder;
    setStorageItem(STORAGE_KEYS.ORDERS, orders);
    return updatedOrder;
  },

  async getCompletedTransactions(): Promise<Order[]> {
    const orders = await this.getOrders();
    return orders.filter(
      (o) => o.status === 'Completed' || o.paymentStatus === 'Paid'
    );
  },

  /**
   * Phase 6.8 — Apply manual ETA adjustment by cashier.
   * Writes updated ETA fields back to localStorage or Supabase.
   */
  async updateOrderEta(id: string, deltaMins: number, reason: string): Promise<Order> {
    if (USE_SUPABASE) {
      const currentOrder = await this.getOrderById(id);
      if (!currentOrder) throw new Error(`Order with ID ${id} not found.`);

      const etaUpdates = applyEtaAdjustment(currentOrder, deltaMins, reason);
      
      const { error } = await supabase
        .from('orders')
        .update({
          estimated_preparation_minutes: etaUpdates.estimatedPreparationMinutes,
          estimated_delivery_minutes: etaUpdates.estimatedDeliveryMinutes,
          estimated_total_minutes: etaUpdates.estimatedTotalMinutes,
          estimated_ready_at: etaUpdates.estimatedReadyAt,
          estimated_arrival_at: etaUpdates.estimatedArrivalAt,
          eta_label: etaUpdates.etaLabel,
          eta_updated_at: etaUpdates.etaUpdatedAt,
          eta_manually_adjusted: etaUpdates.etaManuallyAdjusted,
          eta_adjustment_reason: etaUpdates.etaAdjustmentReason
        })
        .eq('id', id);

      if (error) {
        console.error('Supabase updateOrderEta error:', error.message);
        throw error;
      }

      return {
        ...currentOrder,
        ...etaUpdates
      };
    }

    const orders = await this.getOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error(`Order ${id} not found.`);

    const currentOrder = orders[index];
    const etaUpdates = applyEtaAdjustment(currentOrder, deltaMins, reason);
    const updatedOrder: Order = { ...currentOrder, ...etaUpdates };
    orders[index] = updatedOrder;
    setStorageItem(STORAGE_KEYS.ORDERS, orders);
    return updatedOrder;
  },
};
