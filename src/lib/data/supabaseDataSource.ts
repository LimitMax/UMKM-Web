import { Product, Order, BusinessProfile } from '../../types';
import { DataSource } from './dataSource';
import { supabaseClient } from '../supabase/client';

/**
 * Supabase database driver implementation.
 * Prepared for live Supabase PostgreSQL schema query operations.
 *
 * NOTE: This source will be fully activated and integrated into client layouts
 * in subsequent phases (Phase 7C/7D) once auth flows are resolved.
 */
export const supabaseDataSource: DataSource = {
  async getBusinessProfile(): Promise<BusinessProfile> {
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('id', 'biz-1')
      .single();

    if (error) {
      console.error('Supabase getBusinessProfile error:', error.message);
      throw error;
    }

    return {
      businessName: data.name,
      businessType: data.business_type,
      description: data.description,
      logoUrl: data.logo_url,
      address: data.address,
      whatsappNumber: data.whatsapp_number,
      openingHours: data.opening_hours,
      orderLink: '',
      currency: data.currency || 'IDR',
      taxEnabled: data.tax_enabled,
      taxPercentage: Number(data.tax_percentage),
      serviceChargeEnabled: data.service_charge_enabled,
      serviceChargePercentage: Number(data.service_charge_percentage),
      deliverySettings: data.delivery_settings,
      etaSettings: data.eta_settings,
    };
  },

  async updateBusinessProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const dbPayload: Partial<Record<string, string | number | boolean | object | null>> = {};
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

    const { data, error } = await supabaseClient
      .from('businesses')
      .update(dbPayload)
      .eq('id', 'biz-1')
      .select()
      .single();

    if (error) {
      console.error('Supabase updateBusinessProfile error:', error.message);
      throw error;
    }

    return {
      businessName: data.name,
      businessType: data.business_type,
      description: data.description,
      logoUrl: data.logo_url,
      address: data.address,
      whatsappNumber: data.whatsapp_number,
      openingHours: data.opening_hours,
      orderLink: '',
      currency: data.currency || 'IDR',
      taxEnabled: data.tax_enabled,
      taxPercentage: Number(data.tax_percentage),
      serviceChargeEnabled: data.service_charge_enabled,
      serviceChargePercentage: Number(data.service_charge_percentage),
      deliverySettings: data.delivery_settings,
      etaSettings: data.eta_settings,
    };
  },

  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase getProducts error:', error.message);
      throw error;
    }

    return (data || []).map((p: { id: string; name: string; category: string; price: string | number; stock: number; image_url: string | null; is_active: boolean }) => ({
      id: p.id,
      name: p.name,
      category: p.category as Product['category'],
      price: Number(p.price),
      stock: p.stock,
      imageUrl: p.image_url || '',
      isActive: p.is_active,
    }));
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase getProductById error:', error.message);
      return undefined;
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category as Product['category'],
      price: Number(data.price),
      stock: data.stock,
      imageUrl: data.image_url || '',
      isActive: data.is_active,
    };
  },

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    const { data, error } = await supabaseClient
      .from('products')
      .insert([{
        business_id: 'biz-1',
        name: productData.name,
        category: productData.category,
        price: productData.price,
        stock: productData.stock,
        image_url: productData.imageUrl,
        is_active: productData.isActive,
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase createProduct error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category as Product['category'],
      price: Number(data.price),
      stock: data.stock,
      imageUrl: data.image_url || '',
      isActive: data.is_active,
    };
  },

  async updateProduct(id: string, productData: Partial<Omit<Product, 'id'>>): Promise<Product> {
    const dbPayload: Partial<Record<string, string | number | boolean | object | null>> = {};
    if (productData.name !== undefined) dbPayload.name = productData.name;
    if (productData.category !== undefined) dbPayload.category = productData.category;
    if (productData.price !== undefined) dbPayload.price = productData.price;
    if (productData.stock !== undefined) dbPayload.stock = productData.stock;
    if (productData.imageUrl !== undefined) dbPayload.image_url = productData.imageUrl;
    if (productData.isActive !== undefined) dbPayload.is_active = productData.isActive;

    const { data, error } = await supabaseClient
      .from('products')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateProduct error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category as Product['category'],
      price: Number(data.price),
      stock: data.stock,
      imageUrl: data.image_url || '',
      isActive: data.is_active,
    };
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase deleteProduct error:', error.message);
      throw error;
    }
  },

  async getOrders(): Promise<Order[]> {
    // Placeholder implementation (mapping details will be refined in Phase 7C)
    return [];
  },

  async getOrderById(): Promise<Order | undefined> {
    return undefined;
  },

  async createOrder(): Promise<Order> {
    throw new Error('SupabaseDataSource.createOrder is not fully implemented yet.');
  },

  async updateOrderStatus(): Promise<Order> {
    throw new Error('SupabaseDataSource.updateOrderStatus is not fully implemented yet.');
  },

  async updateOrderEta(): Promise<Order> {
    throw new Error('SupabaseDataSource.updateOrderEta is not fully implemented yet.');
  },
};
