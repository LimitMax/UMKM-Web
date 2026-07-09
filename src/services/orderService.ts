import { Order, OrderStatus, PaymentStatus, OrderItem } from '../types';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './db';
import { productService } from './productService';
import { USE_SUPABASE } from '../config/dbConfig';
import { supabase } from '../lib/supabase';
import { businessService } from './businessService';
import { calculateOrderTotals } from '../utils/calculations';

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
      return data || [];
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
      return data;
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
    const profile = businessService.getProfile();
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

    if (USE_SUPABASE) {
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
          status: 'Waiting for Payment'
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

      return {
        id: order.id,
        queueNumber: order.queue_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        notes: order.notes,
        items: orderData.items,
        subtotal: order.subtotal,
        serviceChargeAmount: order.service_charge_amount,
        taxAmount: order.tax_amount,
        deliveryFeeAmount: order.delivery_fee_amount,
        deliveryAdminFeeAmount: order.delivery_admin_fee_amount,
        freeDeliveryApplied: order.free_delivery_applied,
        fulfillmentType: order.fulfillment_type || 'dine_in',
        recipientName: order.recipient_name,
        deliveryPhone: order.delivery_phone,
        deliveryAddress: order.delivery_address,
        deliveryNotes: order.delivery_notes,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        status: order.status,
        createdAt: order.created_at,
        deliveryDistanceKm: order.delivery_distance_km,
        deliveryDistanceSource: order.delivery_distance_source,
        deliveryFeeCalculationType: order.delivery_fee_calculation_type,
      };
    }

    // Local Storage driver branch
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const orders = await this.getOrders();
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
      createdAt: new Date().toISOString(),
      deliveryDistanceKm: orderData.deliveryDistanceKm,
      deliveryDistanceSource: orderData.deliveryDistanceSource,
      deliveryFeeCalculationType: orderData.deliveryFeeCalculationType,
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
};
