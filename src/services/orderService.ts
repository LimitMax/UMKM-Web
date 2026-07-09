import { Order, OrderStatus, PaymentStatus, OrderItem } from '../types';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './db';
import { productService } from './productService';
import { supabase } from '../lib/supabase';
import { businessService } from './businessService';
import { calculateOrderTotals } from '../utils/calculations';
import { calculateOrderEta, applyEtaAdjustment } from '../utils/etaHelpers';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { 
  mapDbOrderToOrder, 
  mapFrontendStatusToDb, 
  mapFrontendPaymentStatusToDb,
  mapFrontendPaymentMethodToDb
} from '../utils/statusMapper';

const USE_SUPABASE = isSupabaseConfigured();

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

  async getOrdersByBusinessId(businessId: string): Promise<Order[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getOrdersByBusinessId error:', error.message);
        throw error;
      }
      return (data || []).map(mapDbOrderToOrder);
    }
    const orders = await this.getOrders();
    return orders.filter((o) => o.businessId === businessId);
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    if (USE_SUPABASE) {
      // In client-side context, calling client-side supabase directly might fail due to RLS policies.
      // So if window is defined (browser environment), we fetch from the secure public GET API route!
      if (typeof window !== 'undefined') {
        try {
          const response = await fetch(`/api/orders/${id}`);
          if (!response.ok) {
            console.warn(`Secure public lookup for order ${id} returned status:`, response.status);
            return undefined;
          }
          const data = await response.json();
          return mapDbOrderToOrder(data);
        } catch (err) {
          console.error(`Secure public lookup for order ${id} failed:`, err);
          return undefined;
        }
      }

      // On server-side (like API routes or static generation), we query Supabase directly
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Supabase getOrderById error:', error.message);
        return undefined;
      }
      return data ? mapDbOrderToOrder(data) : undefined;
    }

    return (await this.getOrders()).find((o) => o.id === id);
  },

  async getOrderWithItems(orderId: string): Promise<Order | undefined> {
    return this.getOrderById(orderId);
  },

  async getOrdersWithItemsByBusinessId(businessId: string): Promise<Order[]> {
    return this.getOrdersByBusinessId(businessId);
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
    businessId?: string;
  }): Promise<Order> {
    if (USE_SUPABASE) {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Gagal memproses pesanan.');
      }

      const res = await response.json();
      const order = await this.getOrderById(res.id);
      if (!order) {
        throw new Error('Pesanan berhasil dibuat tetapi gagal memuat rincian pesanan.');
      }
      return order;
    }

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
      businessId: orderData.businessId || 'biz-1',
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

      const dbStatus = mapFrontendStatusToDb(status);
      const dbPaymentStatus = mapFrontendPaymentStatusToDb(derivedPaymentStatus);

      const updates: Record<string, string | null> = {
        order_status: dbStatus,
        payment_status: dbPaymentStatus,
        updated_at: new Date().toISOString()
      };

      if (status === 'Completed' && currentOrder.status !== 'Completed') {
        updates.completed_at = new Date().toISOString();
      }
      if (status === 'Cancelled' && currentOrder.status !== 'Cancelled') {
        updates.cancelled_at = new Date().toISOString();
      }
      if (derivedPaymentStatus === 'Paid' && currentOrder.paymentStatus !== 'Paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        console.error('Supabase updateOrderStatus error:', error.message);
        throw error;
      }

      // Create invoice/transaction record if completed
      if (status === 'Completed' && currentOrder.status !== 'Completed') {
        const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { error: txError } = await supabase
          .from('transactions')
          .insert([{
            id: txId,
            business_id: currentOrder.businessId || 'biz-1',
            order_id: id,
            amount: currentOrder.totalAmount,
            payment_method: mapFrontendPaymentMethodToDb(currentOrder.paymentMethod),
            payment_status: 'paid',
            transaction_status: 'paid',
            created_at: new Date().toISOString()
          }]);
        if (txError) {
          console.error('Supabase insert transaction error:', txError.message);
        }
      }

      const updated = await this.getOrderById(id);
      if (!updated) {
        throw new Error('Gagal memuat rincian pesanan yang diperbarui.');
      }
      return updated;
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

  async getCompletedTransactions(businessId?: string): Promise<Order[]> {
    if (USE_SUPABASE) {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .or('order_status.eq.completed,payment_status.eq.paid');
      
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getCompletedTransactions error:', error.message);
        throw error;
      }
      return (data || []).map(mapDbOrderToOrder);
    }
    const orders = await this.getOrders();
    const filtered = orders.filter(
      (o) => o.status === 'Completed' || o.paymentStatus === 'Paid'
    );
    if (businessId) {
      return filtered.filter((o) => o.businessId === businessId);
    }
    return filtered;
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
