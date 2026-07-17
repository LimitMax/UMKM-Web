import { BusinessProfile, OrderEtaSettings, DeliverySettings } from '../types';

export const APP_NAME = 'UMKM Pilot';
export const APP_VERSION = '1.0.0';
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';
export const DEFAULT_CURRENCY = 'IDR';

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  deliveryEnabled: true,
  deliveryFeeEnabled: true,
  deliveryFeeAmount: 10000,
  freeDeliveryEnabled: false,
  freeDeliveryMinimumAmount: 50000,
  deliveryAdminFeeEnabled: false,
  deliveryAdminFeeType: 'fixed',
  deliveryAdminFeeValue: 0,
  deliveryInstruction: 'Pesanan delivery akan dikonfirmasi oleh kasir sebelum dikirim.',
  deliveryFeeCalculationType: 'fixed',
  baseDeliveryFee: 8000,
  baseDeliveryDistanceKm: 2,
  deliveryFeePerKm: 2500,
  maxDeliveryDistanceKm: 10,
  distanceRoundingMode: 'ceil',
  distanceCalculationMode: 'manual',
};

export const DEFAULT_ETA_SETTINGS: OrderEtaSettings = {
  etaEnabled: true,
  defaultPreparationMinutes: 15,
  rushHourBufferMinutes: 5,
  dineInServingBufferMinutes: 3,
  pickupBufferMinutes: 5,
  deliveryBaseMinutes: 5,
  deliveryMinutesPerKm: 4,
  etaDisplayMode: 'both',
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  businessName: 'Warung Kopi Nusantara',
  businessType: 'Kedai Kopi & Makanan',
  description: 'Pesan menu favorit kamu langsung dari meja.',
  logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
  address: 'Jakarta, Indonesia',
  whatsappNumber: '081234567890',
  openingHours: '08.00 - 22.00',
  orderLink: '',
  currency: DEFAULT_CURRENCY,
  taxEnabled: false,
  taxPercentage: 10,
  serviceChargeEnabled: false,
  serviceChargePercentage: 5,
  deliverySettings: DEFAULT_DELIVERY_SETTINGS,
  etaSettings: DEFAULT_ETA_SETTINGS,
};
