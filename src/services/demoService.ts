/**
 * demoService.ts
 *
 * Demo data management utilities for testing and presentation.
 * All operations are synchronous (localStorage only).
 * Designed to be called exclusively from the Admin Settings page.
 */

import { Order, Product, PaymentMethod, OrderStatus, PaymentStatus, FulfillmentType, DeliveryFeeCalculationType } from '../types';
import { getStorageItem, setStorageItem, STORAGE_KEYS, SEED_PRODUCTS } from './db';
import { businessService } from './businessService';
import { calculateOrderTotals } from '../utils/calculations';
import { calculateOrderEta } from '../utils/etaHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DemoStats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;       // stock > 0 && stock <= 5
  outOfStockCount: number;     // stock === 0
  totalOrders: number;
  todayOrdersCount: number;
  activeOrdersCount: number;   // Paid | Processing | Ready | Waiting for Payment
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  todayRevenue: number;        // paid/completed orders today (not cancelled)
}

export interface GenerateResult {
  ordersCreated: number;
  totalRevenue: number;
}

interface SampleOrderBlueprint {
  queueNumber: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  hoursAgo: number;
  fulfillmentType?: FulfillmentType;
  recipientName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  deliveryDistanceKm?: number;
  deliveryDistanceSource?: string;
  deliveryFeeCalculationType?: DeliveryFeeCalculationType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample Orders Blueprint
// Covers: 3 completed, 1 paid-queued, 1 processing, 1 ready, 1 waiting, 1 cancelled
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_ORDER_BLUEPRINTS: SampleOrderBlueprint[] = [
  {
    queueNumber: 'A001',
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    items: [
      { productId: 'prod-1', name: 'Es Kopi Susu Gula Aren', price: 18000, quantity: 2 },
      { productId: 'prod-5', name: 'Es Teh Manis Jumbo', price: 6000, quantity: 1 },
    ],
    paymentMethod: 'Cash',
    status: 'Completed',
    paymentStatus: 'Paid',
    hoursAgo: 5.5,
    fulfillmentType: 'dine_in',
  },
  {
    queueNumber: 'A002',
    customerName: 'Siti Rahayu',
    customerPhone: '082345678901',
    items: [
      { productId: 'prod-2', name: 'Nasi Ayam Geprek Level 5', price: 22000, quantity: 1 },
      { productId: 'prod-1', name: 'Es Kopi Susu Gula Aren', price: 18000, quantity: 1 },
    ],
    paymentMethod: 'QRIS',
    status: 'Completed',
    paymentStatus: 'Paid',
    hoursAgo: 4.75,
    fulfillmentType: 'dine_in',
  },
  {
    queueNumber: 'A003',
    customerName: 'Ahmad Fauzi',
    customerPhone: '083456789012',
    notes: 'Minta nasi ekstra',
    items: [
      { productId: 'prod-7', name: 'Paket Kenyang A (Geprek + Es Teh)', price: 25000, quantity: 2 },
    ],
    paymentMethod: 'Bank Transfer',
    status: 'Completed',
    paymentStatus: 'Paid',
    hoursAgo: 4,
    fulfillmentType: 'pickup',
  },
  {
    queueNumber: 'A004',
    customerName: 'Dewi Kusuma',
    customerPhone: '084567890123',
    items: [
      { productId: 'prod-3', name: 'Mie Goreng Spesial + Telur', price: 15000, quantity: 1 },
      { productId: 'prod-5', name: 'Es Teh Manis Jumbo', price: 6000, quantity: 2 },
    ],
    paymentMethod: 'Cash',
    status: 'Paid',
    paymentStatus: 'Paid',
    hoursAgo: 2.5,
    fulfillmentType: 'delivery',
    recipientName: 'Dewi Kusuma',
    deliveryPhone: '084567890123',
    deliveryAddress: 'Jl. Kemang Raya No. 12, Mampang Prapatan, Jakarta Selatan',
    deliveryNotes: 'Belakang bank Mandiri, pagar hitam',
    deliveryDistanceKm: 3.5,
    deliveryDistanceSource: 'mock',
    deliveryFeeCalculationType: 'distance_based',
  },
  {
    queueNumber: 'A005',
    customerName: 'Rizky Pratama',
    customerPhone: '085678901234',
    items: [
      { productId: 'prod-6', name: 'Kopi Hitam Mandheling', price: 12000, quantity: 1 },
      { productId: 'prod-4', name: 'Roti Bakar Cokelat Keju', price: 14000, quantity: 1 },
    ],
    paymentMethod: 'QRIS',
    status: 'Processing',
    paymentStatus: 'Paid',
    hoursAgo: 1.5,
    fulfillmentType: 'delivery',
    recipientName: 'Rizky Pratama',
    deliveryPhone: '085678901234',
    deliveryAddress: 'Apartemen Kebagusan City, Tower C, Lt. 10 No. 5, Pasar Minggu',
    deliveryNotes: 'Titip di lobby/resepsionis',
    deliveryDistanceKm: 7.2,
    deliveryDistanceSource: 'mock',
    deliveryFeeCalculationType: 'distance_based',
  },
  {
    queueNumber: 'A006',
    customerName: 'Maya Indah Sari',
    customerPhone: '086789012345',
    notes: 'Level 3 pedas saja',
    items: [
      { productId: 'prod-2', name: 'Nasi Ayam Geprek Level 5', price: 22000, quantity: 1 },
    ],
    paymentMethod: 'Cash',
    status: 'Ready',
    paymentStatus: 'Paid',
    hoursAgo: 0.75,
    fulfillmentType: 'dine_in',
  },
  {
    queueNumber: 'A007',
    customerName: 'Fajar Nugroho',
    customerPhone: '087890123456',
    items: [
      { productId: 'prod-1', name: 'Es Kopi Susu Gula Aren', price: 18000, quantity: 1 },
      { productId: 'prod-4', name: 'Roti Bakar Cokelat Keju', price: 14000, quantity: 1 },
    ],
    paymentMethod: 'QRIS',
    status: 'Waiting for Payment',
    paymentStatus: 'Waiting for Payment',
    hoursAgo: 0.25,
    fulfillmentType: 'dine_in',
  },
  {
    queueNumber: 'A008',
    customerName: 'Lisa Permata',
    customerPhone: '088901234567',
    items: [
      { productId: 'prod-7', name: 'Paket Kenyang A (Geprek + Es Teh)', price: 25000, quantity: 1 },
    ],
    paymentMethod: 'Cash',
    status: 'Cancelled',
    paymentStatus: 'Waiting for Payment',
    hoursAgo: 3.5,
    fulfillmentType: 'pickup',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const demoService = {
  /**
   * Returns live statistics from localStorage for the settings page.
   */
  getStats(): DemoStats {
    if (typeof window === 'undefined') {
      return {
        totalProducts: 0, activeProducts: 0, lowStockCount: 0, outOfStockCount: 0,
        totalOrders: 0, todayOrdersCount: 0, activeOrdersCount: 0,
        completedOrdersCount: 0, cancelledOrdersCount: 0, todayRevenue: 0,
      };
    }

    const products = getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const orders = getStorageItem<Order[]>(STORAGE_KEYS.ORDERS, []);
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter(
      (o) => new Date(o.createdAt).toDateString() === todayStr,
    );

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStockCount: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
      outOfStockCount: products.filter((p) => p.stock === 0).length,
      totalOrders: orders.length,
      todayOrdersCount: todayOrders.length,
      activeOrdersCount: orders.filter(
        (o) => o.status !== 'Completed' && o.status !== 'Cancelled',
      ).length,
      completedOrdersCount: orders.filter((o) => o.status === 'Completed').length,
      cancelledOrdersCount: orders.filter((o) => o.status === 'Cancelled').length,
      todayRevenue: todayOrders
        .filter(
          (o) =>
            o.status !== 'Cancelled' &&
            (o.paymentStatus === 'Paid' || o.status === 'Completed'),
        )
        .reduce((sum, o) => sum + o.totalAmount, 0),
    };
  },

  /**
   * Wipes all orders AND restores seed products — full factory reset.
   */
  resetAll(): void {
    if (typeof window === 'undefined') return;
    setStorageItem(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    setStorageItem(STORAGE_KEYS.ORDERS, []);
    setStorageItem(STORAGE_KEYS.QUEUE, 0);
  },

  /**
   * Clears all orders and resets queue counter. Preserves products.
   */
  clearOrders(): void {
    if (typeof window === 'undefined') return;
    setStorageItem(STORAGE_KEYS.ORDERS, []);
    setStorageItem(STORAGE_KEYS.QUEUE, 0);
  },

  /**
   * Restores seed product catalog without touching orders.
   */
  restoreProducts(): void {
    if (typeof window === 'undefined') return;
    setStorageItem(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
  },

  /**
   * Generates 8 realistic demo orders (mixed statuses) for today.
   * Always restores seed products first to ensure stock consistency.
   * Deducts stock for all non-cancelled orders.
   *
   * Expected dashboard after this call:
   *   - Omzet hari ini: Rp 207.000
   *   - Antrean aktif: 4 pesanan
   *   - Produk terlaris: Es Kopi Susu Gula Aren (4 cup)
   *   - Stok berkurang sesuai pesanan aktif
   */
  generateSampleOrders(): GenerateResult {
    if (typeof window === 'undefined') return { ordersCreated: 0, totalRevenue: 0 };

    const now = new Date();

    // Always start from a clean product slate for consistency
    const products: Product[] = SEED_PRODUCTS.map((p) => ({ ...p }));

    // Build order objects
    const orders: Order[] = SAMPLE_ORDER_BLUEPRINTS.map((blueprint, index) => {
      const createdAt = new Date(
        now.getTime() - blueprint.hoursAgo * 3_600_000,
      ).toISOString();

      const subtotal = blueprint.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const profile = businessService.getProfileSync();
      const totals = calculateOrderTotals({
        subtotal,
        fulfillmentType: blueprint.fulfillmentType || 'dine_in',
        taxEnabled: profile.taxEnabled,
        taxPercentage: profile.taxPercentage,
        serviceChargeEnabled: profile.serviceChargeEnabled,
        serviceChargePercentage: profile.serviceChargePercentage,
        deliverySettings: profile.deliverySettings,
        deliveryDistanceKm: blueprint.deliveryDistanceKm,
      });

      return {
        id: `demo-order-${index + 1}-${now.getTime()}`,
        queueNumber: blueprint.queueNumber,
        customerName: blueprint.customerName,
        customerPhone: blueprint.customerPhone,
        notes: blueprint.notes,
        items: blueprint.items,
        subtotal: totals.subtotal,
        serviceChargeAmount: totals.serviceChargeAmount,
        taxAmount: totals.taxAmount,
        deliveryFeeAmount: totals.deliveryFeeAmount,
        deliveryAdminFeeAmount: totals.deliveryAdminFeeAmount,
        freeDeliveryApplied: totals.freeDeliveryApplied,
        totalAmount: totals.totalAmount,
        fulfillmentType: blueprint.fulfillmentType || 'dine_in',
        recipientName: blueprint.recipientName,
        deliveryPhone: blueprint.deliveryPhone,
        deliveryAddress: blueprint.deliveryAddress,
        deliveryNotes: blueprint.deliveryNotes,
        paymentMethod: blueprint.paymentMethod,
        paymentStatus: blueprint.paymentStatus,
        status: blueprint.status,
        createdAt,
        deliveryDistanceKm: blueprint.deliveryDistanceKm,
        deliveryDistanceSource: blueprint.deliveryDistanceSource,
        deliveryFeeCalculationType: blueprint.deliveryFeeCalculationType || 'fixed',
        // Phase 6.8 — ETA injection
        ...(profile.etaSettings?.etaEnabled ? (() => {
          const etaResult = calculateOrderEta(
            blueprint.fulfillmentType || 'dine_in',
            createdAt,
            profile.etaSettings!,
            blueprint.deliveryDistanceKm
          );
          return {
            estimatedPreparationMinutes: etaResult.estimatedPreparationMinutes,
            estimatedDeliveryMinutes: etaResult.estimatedDeliveryMinutes,
            estimatedTotalMinutes: etaResult.estimatedTotalMinutes,
            estimatedReadyAt: etaResult.estimatedReadyAt,
            estimatedArrivalAt: etaResult.estimatedArrivalAt,
            etaLabel: etaResult.etaLabel,
            etaUpdatedAt: etaResult.etaUpdatedAt,
            etaManuallyAdjusted: false,
          };
        })() : {}),
      };
    });

    // Deduct stock for non-cancelled orders
    orders.forEach((order) => {
      if (order.status !== 'Cancelled') {
        order.items.forEach((item) => {
          const idx = products.findIndex((p) => p.id === item.productId);
          if (idx !== -1) {
            products[idx] = {
              ...products[idx],
              stock: Math.max(0, products[idx].stock - item.quantity),
            };
          }
        });
      }
    });

    // Persist both products and orders
    setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    setStorageItem(STORAGE_KEYS.ORDERS, orders);
    setStorageItem(STORAGE_KEYS.QUEUE, SAMPLE_ORDER_BLUEPRINTS.length);

    const totalRevenue = orders
      .filter(
        (o) =>
          o.status !== 'Cancelled' &&
          (o.paymentStatus === 'Paid' || o.status === 'Completed'),
      )
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return { ordersCreated: orders.length, totalRevenue };
  },

  /**
   * Sets 3 specific products to critically low stock (2–4 units)
   * to trigger low-stock warnings in dashboard and stock page.
   * Requires that products exist in localStorage.
   */
  setLowStockDemo(): void {
    if (typeof window === 'undefined') return;

    const products = getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    if (products.length === 0) {
      // If no products exist, seed them first then apply low stock
      const seeded: Product[] = SEED_PRODUCTS.map((p) => ({ ...p }));
      const adjustments: Record<string, number> = {
        'prod-4': 3,
        'prod-7': 2,
        'prod-1': 4,
      };
      const updated = seeded.map((p) =>
        adjustments[p.id] !== undefined ? { ...p, stock: adjustments[p.id] } : p,
      );
      setStorageItem(STORAGE_KEYS.PRODUCTS, updated);
      return;
    }

    const adjustments: Record<string, number> = {
      'prod-4': 3,  // Roti Bakar Cokelat Keju → 3 unit
      'prod-7': 2,  // Paket Kenyang → 2 unit
      'prod-1': 4,  // Es Kopi Susu → 4 unit
    };

    const updated = products.map((p) =>
      adjustments[p.id] !== undefined ? { ...p, stock: adjustments[p.id] } : p,
    );
    setStorageItem(STORAGE_KEYS.PRODUCTS, updated);
  },
};
