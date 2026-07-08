export type ProductCategory = 'Makanan' | 'Minuman' | 'Snack' | 'Paket Promo';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  imageUrl: string;
  isActive: boolean;
}

export type PaymentMethod = 'Cash' | 'QRIS' | 'Bank Transfer';

export type PaymentStatus = 'Waiting for Payment' | 'Paid' | 'Failed';

export type OrderStatus =
  | 'Waiting for Payment'
  | 'Paid'
  | 'Processing'
  | 'Ready'
  | 'Completed'
  | 'Cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  queueNumber: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  items: OrderItem[];
  subtotal?: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
}

export interface BusinessProfile {
  businessName: string;
  businessType: string;
  description: string;
  logoUrl: string;
  address: string;
  whatsappNumber: string;
  openingHours: string;
  orderLink: string;
  currency: string;
  taxEnabled: boolean;
  taxPercentage: number;
  serviceChargeEnabled: boolean;
  serviceChargePercentage: number;
}

export interface SalesSummary {
  todayRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  bestSeller: { name: string; quantity: number } | null;
  lowStockCount: number;
}

export interface AIInsight {
  summary: string;
  recommendations: string[];
  suggestedPromo: {
    title: string;
    description: string;
    caption: string;
  };
}
