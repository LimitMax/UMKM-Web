import { Order, BusinessProfile } from '../types';

export interface ReportFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  orderStatus: string; // 'All' | 'Active' | OrderStatus
  paymentStatus: string; // 'All' | PaymentStatus
  paymentMethod: string; // 'All' | PaymentMethod
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItemsSold: number;
  bestSellerName: string;
  bestSellerQty: number;
  paymentMethodBreakdown: {
    cash: number;
    qris: number;
    transfer: number;
  };
}

/**
 * Filter orders based on start date, end date, order status, payment status, and payment method.
 */
export function filterOrders(orders: Order[], filters: ReportFilters): Order[] {
  return orders.filter((order) => {
    // 1. Date filters
    const orderTime = new Date(order.createdAt).getTime();
    if (filters.startDate) {
      const startMs = new Date(`${filters.startDate}T00:00:00`).getTime();
      if (orderTime < startMs) return false;
    }
    if (filters.endDate) {
      const endMs = new Date(`${filters.endDate}T23:59:59.999`).getTime();
      if (orderTime > endMs) return false;
    }

    // 2. Order status filter
    // 'Active' excludes 'Cancelled' by default on page load.
    // 'All' includes all statuses.
    if (filters.orderStatus === 'Active') {
      if (order.status === 'Cancelled') return false;
    } else if (filters.orderStatus !== 'All') {
      if (order.status !== filters.orderStatus) return false;
    }

    // 3. Payment status filter
    if (filters.paymentStatus !== 'All') {
      if (order.paymentStatus !== filters.paymentStatus) return false;
    }

    // 4. Payment method filter
    if (filters.paymentMethod !== 'All') {
      if (order.paymentMethod !== filters.paymentMethod) return false;
    }

    return true;
  });
}

/**
 * Calculate summary cards data based on filtered orders list.
 */
export function calculateReportSummary(orders: Order[]): ReportSummary {
  let totalRevenue = 0;
  let totalItemsSold = 0;
  const productSales: { [name: string]: number } = {};
  let cash = 0;
  let qris = 0;
  let transfer = 0;

  orders.forEach((order) => {
    totalRevenue += order.totalAmount;
    
    // Sum payment methods
    if (order.paymentMethod === 'Cash') {
      cash += order.totalAmount;
    } else if (order.paymentMethod === 'QRIS') {
      qris += order.totalAmount;
    } else if (order.paymentMethod === 'Bank Transfer') {
      transfer += order.totalAmount;
    }

    // Process items
    order.items.forEach((item) => {
      totalItemsSold += item.quantity;
      productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
    });
  });

  // Calculate best seller
  let bestSellerName = '-';
  let bestSellerQty = 0;
  Object.entries(productSales).forEach(([name, qty]) => {
    if (qty > bestSellerQty) {
      bestSellerName = name;
      bestSellerQty = qty;
    }
  });

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalItemsSold,
    bestSellerName,
    bestSellerQty,
    paymentMethodBreakdown: {
      cash,
      qris,
      transfer,
    },
  };
}

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate a CSV string containing standard order data.
 */
export function generateCSVReport(orders: Order[], businessProfile: BusinessProfile): string {
  const headers = [
    'ID Pesanan',
    'No. Antrean',
    'Nama Pelanggan',
    'No. WhatsApp',
    'Tanggal Pesanan',
    'Metode Pembayaran',
    'Status Pembayaran',
    'Status Pesanan',
    'Daftar Menu',
    'Total Qty',
    'Subtotal',
    'Biaya Layanan',
    'Pajak',
    'Total Akhir',
    'Catatan',
    'Nama Toko',
    'Kategori Toko',
    'Fulfillment Type',
    'Recipient Name',
    'Delivery Phone',
    'Delivery Address',
    'Delivery Fee',
    'Delivery Admin Fee',
    'Free Delivery Applied',
    'Delivery Distance KM',
    'Delivery Fee Calculation Type',
    'ETA Label',
    'Estimasi Total Menit',
    'Estimasi Siap',
    'Estimasi Sampai',
    'Disesuaikan Manual',
    'Alasan Penyesuaian',
  ];

  const rows = orders.map((order) => {
    const itemNames = order.items.map((item) => `${item.name} x${item.quantity}`).join(', ');
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = order.subtotal ?? order.totalAmount;

    return [
      escapeCsvValue(order.id),
      escapeCsvValue(order.queueNumber),
      escapeCsvValue(order.customerName),
      escapeCsvValue(order.customerPhone),
      escapeCsvValue(new Date(order.createdAt).toLocaleString('id-ID')),
      escapeCsvValue(order.paymentMethod === 'Cash' ? 'Tunai' : order.paymentMethod === 'Bank Transfer' ? 'Transfer Bank' : 'QRIS'),
      escapeCsvValue(order.paymentStatus === 'Paid' ? 'Lunas' : order.paymentStatus === 'Failed' ? 'Gagal' : 'Belum Bayar'),
      escapeCsvValue(order.status),
      escapeCsvValue(itemNames),
      escapeCsvValue(totalQty),
      escapeCsvValue(subtotal),
      escapeCsvValue(order.serviceChargeAmount ?? 0),
      escapeCsvValue(order.taxAmount ?? 0),
      escapeCsvValue(order.totalAmount),
      escapeCsvValue(order.notes ?? ''),
      escapeCsvValue(businessProfile.businessName),
      escapeCsvValue(businessProfile.businessType),
      escapeCsvValue(order.fulfillmentType || 'dine_in'),
      escapeCsvValue(order.recipientName || ''),
      escapeCsvValue(order.deliveryPhone || ''),
      escapeCsvValue(order.deliveryAddress || ''),
      escapeCsvValue(order.deliveryFeeAmount ?? 0),
      escapeCsvValue(order.deliveryAdminFeeAmount ?? 0),
      escapeCsvValue(order.freeDeliveryApplied ? 'true' : 'false'),
      escapeCsvValue(order.deliveryDistanceKm !== undefined ? order.deliveryDistanceKm : ''),
      escapeCsvValue(order.deliveryFeeCalculationType || 'fixed'),
      // Phase 6.8 ETA columns
      escapeCsvValue(order.etaLabel || ''),
      escapeCsvValue(order.estimatedTotalMinutes !== undefined ? order.estimatedTotalMinutes : ''),
      escapeCsvValue(order.estimatedReadyAt || ''),
      escapeCsvValue(order.estimatedArrivalAt || ''),
      escapeCsvValue(order.etaManuallyAdjusted ? 'true' : 'false'),
      escapeCsvValue(order.etaAdjustmentReason || ''),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');

  return csvContent;
}
