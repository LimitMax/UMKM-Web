import { BusinessProfile } from '../types';
import { getStorageItem, setStorageItem } from './db';

export const BUSINESS_PROFILE_KEY = 'umkm_pilot_business_profile';

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  businessName: 'Warung Kopi Nusantara',
  businessType: 'Kedai Kopi & Makanan',
  description: 'Pesan menu favorit kamu langsung dari meja.',
  logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
  address: 'Jakarta, Indonesia',
  whatsappNumber: '081234567890',
  openingHours: '08.00 - 22.00',
  orderLink: '',
  currency: 'IDR',
  taxEnabled: false,
  taxPercentage: 10,
  serviceChargeEnabled: false,
  serviceChargePercentage: 5,
};

export const businessService = {
  getProfile(): BusinessProfile {
    const profile = getStorageItem<BusinessProfile>(BUSINESS_PROFILE_KEY, DEFAULT_BUSINESS_PROFILE);
    // Return with defaults fallback for safety
    return {
      ...DEFAULT_BUSINESS_PROFILE,
      ...profile,
    };
  },

  updateProfile(profile: Partial<BusinessProfile>): BusinessProfile {
    const current = this.getProfile();
    const updated = {
      ...current,
      ...profile,
    };
    setStorageItem(BUSINESS_PROFILE_KEY, updated);
    return updated;
  },

  resetProfile(): BusinessProfile {
    setStorageItem(BUSINESS_PROFILE_KEY, DEFAULT_BUSINESS_PROFILE);
    return DEFAULT_BUSINESS_PROFILE;
  }
};
