export type ProductCategory = 'Makanan' | 'Minuman' | 'Snack' | 'Paket Promo';

export type FulfillmentType = 'dine_in' | 'pickup' | 'delivery';

export type DeliveryFeeCalculationType = 'fixed' | 'distance_based';
export type DistanceRoundingMode = 'ceil' | 'round' | 'floor';
export type DistanceCalculationMode = 'manual' | 'mock' | 'maps_api_later';
export type EtaDisplayMode = 'minutes_only' | 'estimated_time' | 'both';

// Phase 6.8 — ETA Settings
export interface OrderEtaSettings {
  etaEnabled: boolean;
  defaultPreparationMinutes: number;
  rushHourBufferMinutes: number;
  dineInServingBufferMinutes: number;
  pickupBufferMinutes: number;
  deliveryBaseMinutes: number;
  deliveryMinutesPerKm: number;
  etaDisplayMode: EtaDisplayMode;
}

export interface DeliverySettings {
  deliveryEnabled: boolean;
  deliveryFeeEnabled: boolean;
  deliveryFeeAmount: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryMinimumAmount: number;
  deliveryAdminFeeEnabled: boolean;
  deliveryAdminFeeType: 'fixed' | 'percentage';
  deliveryAdminFeeValue: number;
  deliveryInstruction: string;
  // Phase 6.6B extensions
  deliveryFeeCalculationType?: DeliveryFeeCalculationType;
  baseDeliveryFee?: number;
  baseDeliveryDistanceKm?: number;
  deliveryFeePerKm?: number;
  maxDeliveryDistanceKm?: number;
  distanceRoundingMode?: DistanceRoundingMode;
  distanceCalculationMode?: DistanceCalculationMode;
}

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
  | 'delivering'
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
  // Delivery/fulfillment extensions
  fulfillmentType?: FulfillmentType;
  recipientName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  deliveryFeeAmount?: number;
  deliveryAdminFeeAmount?: number;
  freeDeliveryApplied?: boolean;
  // Phase 6.6B extensions
  deliveryDistanceKm?: number;
  deliveryDistanceSource?: string;
  deliveryFeeCalculationType?: DeliveryFeeCalculationType;
  // Phase 6.8 — ETA fields (all optional for backward compat)
  estimatedPreparationMinutes?: number;
  estimatedDeliveryMinutes?: number;
  estimatedTotalMinutes?: number;
  estimatedReadyAt?: string;     // ISO string
  estimatedArrivalAt?: string;   // ISO string (delivery only)
  etaLabel?: string;
  etaUpdatedAt?: string;         // ISO string
  etaManuallyAdjusted?: boolean;
  etaAdjustmentReason?: string;
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
  deliverySettings?: DeliverySettings;
  etaSettings?: OrderEtaSettings;
}

export interface SalesSummary {
  todayRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  bestSeller: { name: string; quantity: number } | null;
  lowStockCount: number;
}

export interface PromoRecommendation {
  id: string;
  title: string;
  reason: string;
  mainProductName: string;
  bundleProductName: string;
  suggestedPromoName: string;
  suggestedDiscountAmount: number;
  suggestedPrice: number;
  normalPrice: number;
  estimatedSavings: number;
  targetTime: string;
  targetCustomer: string;
  campaignGoal: string;
  whatsappCaption: string;
  instagramCaption: string;
  shortCaption: string;
  confidenceScore: number;
  basedOnSignals: string[];
}

export interface AIInsight {
  summary: string;
  recommendations: string[];
  suggestedPromo: {
    title: string;
    description: string;
    caption: string;
  };
  promoRecommendations?: PromoRecommendation[];
}

export const FULFILLMENT_LABELS = {
  dine_in: 'Makan di Tempat',
  pickup: 'Ambil Sendiri',
  delivery: 'Delivery',
} as const;
