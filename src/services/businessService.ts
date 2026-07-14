import { BusinessProfile, OrderEtaSettings, DeliverySettings } from '../types';
import { getStorageItem, setStorageItem } from './db';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { supabaseClient } from '../lib/supabase/client';
import { supabaseDataSource } from '../lib/data/supabaseDataSource';
import { DataSourceMode } from '../config/dataSourceConfig';

export const BUSINESS_PROFILE_KEY = 'umkm_pilot_business_profile';

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
  currency: 'IDR',
  taxEnabled: false,
  taxPercentage: 10,
  serviceChargeEnabled: false,
  serviceChargePercentage: 5,
  deliverySettings: DEFAULT_DELIVERY_SETTINGS,
  etaSettings: DEFAULT_ETA_SETTINGS,
};

export const businessService = {
  async updateProfileViaApi(profile: Partial<BusinessProfile>, businessId?: string): Promise<BusinessProfile> {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session?.access_token || '';

    if (!token) {
      throw new Error('Sesi login tidak ditemukan.');
    }

    const response = await fetch('/api/admin/business-profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        businessId,
        profile,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.profile) {
      throw new Error(payload?.message || 'Gagal memperbarui profil bisnis.');
    }

    return payload.profile as BusinessProfile;
  },

  resolveMode(mode?: DataSourceMode): DataSourceMode {
    if (mode) return mode;
    return isSupabaseConfigured() ? 'supabase' : 'localStorage';
  },

  getProfileSync(): BusinessProfile {
    const profile = getStorageItem<BusinessProfile>(BUSINESS_PROFILE_KEY, DEFAULT_BUSINESS_PROFILE);
    return {
      ...DEFAULT_BUSINESS_PROFILE,
      ...profile,
      deliverySettings: {
        ...DEFAULT_DELIVERY_SETTINGS,
        ...(profile?.deliverySettings || {}),
      },
      etaSettings: {
        ...DEFAULT_ETA_SETTINGS,
        ...(profile?.etaSettings || {}),
      },
    };
  },

  async getProfile(mode?: DataSourceMode, businessId?: string): Promise<BusinessProfile> {
    const activeMode = this.resolveMode(mode);
    
    if (activeMode === 'supabase') {
      return supabaseDataSource.getBusinessProfile(businessId);
    }
    return this.getProfileSync();
  },

  async updateProfile(profile: Partial<BusinessProfile>, mode?: DataSourceMode, businessId?: string): Promise<BusinessProfile> {
    const activeMode = this.resolveMode(mode);

    if (activeMode === 'supabase') {
      if (typeof window !== 'undefined') {
        return this.updateProfileViaApi(profile, businessId);
      }
      return supabaseDataSource.updateBusinessProfile(profile, businessId);
    }

    const current = this.getProfileSync();
    const updated = {
      ...current,
      ...profile,
    };
    setStorageItem(BUSINESS_PROFILE_KEY, updated);
    return updated;
  },

  async resetProfile(mode?: DataSourceMode, businessId?: string): Promise<BusinessProfile> {
    const activeMode = this.resolveMode(mode);

    if (activeMode === 'supabase') {
      if (typeof window !== 'undefined') {
        return this.updateProfileViaApi(DEFAULT_BUSINESS_PROFILE, businessId);
      }
      return supabaseDataSource.updateBusinessProfile(DEFAULT_BUSINESS_PROFILE, businessId);
    }

    setStorageItem(BUSINESS_PROFILE_KEY, DEFAULT_BUSINESS_PROFILE);
    return DEFAULT_BUSINESS_PROFILE;
  },

  // Alias functions to satisfy strict prompts
  async getBusinessProfile(businessId?: string, mode?: DataSourceMode): Promise<BusinessProfile> {
    return this.getProfile(mode, businessId);
  },

  async updateBusinessProfile(profile: Partial<BusinessProfile>, businessId?: string, mode?: DataSourceMode): Promise<BusinessProfile> {
    return this.updateProfile(profile, mode, businessId);
  },

  async resetBusinessProfile(businessId?: string, mode?: DataSourceMode): Promise<BusinessProfile> {
    return this.resetProfile(mode, businessId);
  },

  async getBusinessSettings(businessId?: string, mode?: DataSourceMode) {
    const profile = await this.getProfile(mode, businessId);
    return {
      taxEnabled: profile.taxEnabled,
      taxPercentage: profile.taxPercentage,
      serviceChargeEnabled: profile.serviceChargeEnabled,
      serviceChargePercentage: profile.serviceChargePercentage,
      deliverySettings: profile.deliverySettings,
      etaSettings: profile.etaSettings,
    };
  }
};
