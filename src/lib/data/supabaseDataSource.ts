import { Product, Order, BusinessProfile } from '../../types';
import { supabaseClient } from '../supabase/client';
import { 
  mapSupabaseBusinessToBusinessProfile,
  mapBusinessProfileToSupabaseBusinessUpdate,
  mapSupabaseProductToProduct,
  mapProductToSupabaseInsert,
  mapProductToSupabaseUpdate 
} from './mappers';

/**
 * Helper to dynamically resolve the business ID.
 * Returns providedId if present; otherwise resolves from the authenticated
 * Supabase session profile.
 */
async function resolveBusinessId(providedId?: string): Promise<string> {
  if (providedId) return providedId;
  
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!error && profile?.business_id) {
        return profile.business_id;
      }
    }
  } catch (err) {
    console.error('Error resolving business ID in supabaseDataSource:', err);
  }
  
  throw new Error('Business ID tidak ditemukan untuk sesi aktif.');
}

/**
 * Supabase database driver implementation.
 * Queries/updates real PostgreSQL tables by checking dynamic session business IDs.
 */
export const supabaseDataSource = {
  async getBusinessProfile(businessId?: string): Promise<BusinessProfile> {
    const resolvedId = await resolveBusinessId(businessId);
    
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('id', resolvedId)
      .single();

    if (error) {
      console.error('Supabase getBusinessProfile error:', error.message);
      throw error;
    }

    return mapSupabaseBusinessToBusinessProfile(data);
  },

  async updateBusinessProfile(profile: Partial<BusinessProfile>, businessId?: string): Promise<BusinessProfile> {
    const resolvedId = await resolveBusinessId(businessId);
    const dbPayload = mapBusinessProfileToSupabaseBusinessUpdate(profile);

    const { error } = await supabaseClient
      .from('businesses')
      .update(dbPayload)
      .eq('id', resolvedId);

    if (error) {
      console.error('Supabase updateBusinessProfile error:', error.message);
      throw error;
    }

    return this.getBusinessProfile(resolvedId);
  },

  async getProducts(businessId?: string): Promise<Product[]> {
    const resolvedId = await resolveBusinessId(businessId);

    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('business_id', resolvedId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase getProducts error:', error.message);
      throw error;
    }

    return (data || []).map(mapSupabaseProductToProduct);
  },

  async getProductById(id: string, businessId?: string): Promise<Product | undefined> {
    const resolvedId = await resolveBusinessId(businessId);

    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('business_id', resolvedId)
      .maybeSingle();

    if (error) {
      console.error('Supabase getProductById error:', error.message);
      return undefined;
    }

    if (!data) return undefined;
    return mapSupabaseProductToProduct(data);
  },

  async createProduct(productData: Omit<Product, 'id'>, businessId?: string): Promise<Product> {
    const resolvedId = await resolveBusinessId(businessId);
    const insertPayload = mapProductToSupabaseInsert(productData, resolvedId);

    const { data, error } = await supabaseClient
      .from('products')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Supabase createProduct error:', error.message);
      throw error;
    }

    return mapSupabaseProductToProduct(data);
  },

  async updateProduct(id: string, productData: Partial<Omit<Product, 'id'>>, businessId?: string): Promise<Product> {
    const resolvedId = await resolveBusinessId(businessId);
    const updatePayload = mapProductToSupabaseUpdate(productData);

    const { data, error } = await supabaseClient
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('business_id', resolvedId)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateProduct error:', error.message);
      throw error;
    }

    return mapSupabaseProductToProduct(data);
  },

  async deleteProduct(id: string, businessId?: string): Promise<void> {
    const resolvedId = await resolveBusinessId(businessId);
    const { error } = await supabaseClient
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', resolvedId);

    if (error) {
      console.error('Supabase deleteProduct error:', error.message);
      throw error;
    }
  },

  async getOrders(): Promise<Order[]> {
    // Orders remain localStorage for now (Phase 7C limitation)
    return [];
  },

  async getOrderById(): Promise<Order | undefined> {
    return undefined;
  },

  async createOrder(): Promise<Order> {
    throw new Error('Orders are not migrated to Supabase in Phase 7C.');
  },

  async updateOrderStatus(): Promise<Order> {
    throw new Error('Orders are not migrated to Supabase in Phase 7C.');
  },

  async updateOrderEta(): Promise<Order> {
    throw new Error('Orders are not migrated to Supabase in Phase 7C.');
  },
};
