import { Product, BusinessProfile, ProductCategory, DeliverySettings, OrderEtaSettings } from '../../types';

/** Raw Supabase row shapes — only the fields we actually read */
interface SupabaseBusinessRow {
  id?: string;
  name?: string;
  business_type?: string;
  description?: string;
  logo_url?: string;
  address?: string;
  whatsapp_number?: string;
  opening_hours?: string;
  currency?: string;
  tax_enabled?: boolean;
  tax_percentage?: number | string;
  service_charge_enabled?: boolean;
  service_charge_percentage?: number | string;
  delivery_settings?: Partial<DeliverySettings>;
  eta_settings?: Partial<OrderEtaSettings>;
}

interface SupabaseBusinessUpdatePayload {
  name?: string;
  business_type?: string;
  description?: string;
  logo_url?: string;
  address?: string;
  whatsapp_number?: string;
  opening_hours?: string;
  currency?: string;
  tax_enabled?: boolean;
  tax_percentage?: number;
  service_charge_enabled?: boolean;
  service_charge_percentage?: number;
  delivery_settings?: Partial<DeliverySettings>;
  eta_settings?: Partial<OrderEtaSettings>;
}

interface SupabaseProductRow {
  id?: string;
  business_id?: string;
  name?: string;
  category?: string;
  price?: number | string;
  stock?: number;
  image_url?: string;
  is_active?: boolean;
}

interface SupabaseProductInsertPayload {
  id: string;
  business_id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  is_active: boolean;
}

interface SupabaseProductUpdatePayload {
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  image_url?: string;
  is_active?: boolean;
}

export function mapSupabaseBusinessToBusinessProfile(data: SupabaseBusinessRow): BusinessProfile {
  if (!data) return {} as BusinessProfile;
  return {
    businessName: data.name || '',
    businessType: data.business_type || 'makanan_minuman',
    description: data.description || '',
    logoUrl: data.logo_url || '',
    address: data.address || '',
    whatsappNumber: data.whatsapp_number || '',
    openingHours: data.opening_hours || '',
    orderLink: '',
    currency: data.currency || 'IDR',
    taxEnabled: data.tax_enabled ?? false,
    taxPercentage: Number(data.tax_percentage || 0),
    serviceChargeEnabled: data.service_charge_enabled ?? false,
    serviceChargePercentage: Number(data.service_charge_percentage || 0),
    deliverySettings: (data.delivery_settings || {}) as DeliverySettings,
    etaSettings: (data.eta_settings || {}) as OrderEtaSettings,
  };
}

export function mapBusinessProfileToSupabaseBusinessUpdate(profile: Partial<BusinessProfile>): SupabaseBusinessUpdatePayload {
  const dbPayload: SupabaseBusinessUpdatePayload = {};
  if (profile.businessName !== undefined) dbPayload.name = profile.businessName;
  if (profile.businessType !== undefined) dbPayload.business_type = profile.businessType;
  if (profile.description !== undefined) dbPayload.description = profile.description;
  if (profile.logoUrl !== undefined) dbPayload.logo_url = profile.logoUrl;
  if (profile.address !== undefined) dbPayload.address = profile.address;
  if (profile.whatsappNumber !== undefined) dbPayload.whatsapp_number = profile.whatsappNumber;
  if (profile.openingHours !== undefined) dbPayload.opening_hours = profile.openingHours;
  if (profile.currency !== undefined) dbPayload.currency = profile.currency;
  if (profile.taxEnabled !== undefined) dbPayload.tax_enabled = profile.taxEnabled;
  if (profile.taxPercentage !== undefined) dbPayload.tax_percentage = profile.taxPercentage;
  if (profile.serviceChargeEnabled !== undefined) dbPayload.service_charge_enabled = profile.serviceChargeEnabled;
  if (profile.serviceChargePercentage !== undefined) dbPayload.service_charge_percentage = profile.serviceChargePercentage;
  if (profile.deliverySettings !== undefined) dbPayload.delivery_settings = profile.deliverySettings;
  if (profile.etaSettings !== undefined) dbPayload.eta_settings = profile.etaSettings;
  return dbPayload;
}

export function mapSupabaseProductToProduct(data: SupabaseProductRow): Product {
  if (!data) return {} as Product;
  return {
    id: data.id || '',
    name: data.name || '',
    category: (data.category || 'Makanan') as ProductCategory,
    price: Number(data.price || 0),
    stock: data.stock ?? 0,
    imageUrl: data.image_url || '',
    isActive: data.is_active ?? true,
  };
}

export function mapProductToSupabaseInsert(product: Omit<Product, 'id'>, businessId: string): SupabaseProductInsertPayload {
  // Generate a safe string primary key since it's VARCHAR(255)
  const generatedId = 'prod-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  return {
    id: generatedId,
    business_id: businessId,
    name: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    image_url: product.imageUrl,
    is_active: product.isActive,
  };
}

export function mapProductToSupabaseUpdate(product: Partial<Omit<Product, 'id'>>): SupabaseProductUpdatePayload {
  const dbPayload: SupabaseProductUpdatePayload = {};
  if (product.name !== undefined) dbPayload.name = product.name;
  if (product.category !== undefined) dbPayload.category = product.category;
  if (product.price !== undefined) dbPayload.price = product.price;
  if (product.stock !== undefined) dbPayload.stock = product.stock;
  if (product.imageUrl !== undefined) dbPayload.image_url = product.imageUrl;
  if (product.isActive !== undefined) dbPayload.is_active = product.isActive;
  return dbPayload;
}
