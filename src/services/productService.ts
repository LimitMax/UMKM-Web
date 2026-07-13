import { Product } from '../types';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './db';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { supabaseDataSource } from '../lib/data/supabaseDataSource';
import { DataSourceMode } from '../config/dataSourceConfig';

export const productService = {
  // Check active mode dynamically based on Supabase setup and local session
  resolveMode(mode?: DataSourceMode): DataSourceMode {
    if (mode) return mode;
    
    if (typeof window !== 'undefined') {
      const session = window.localStorage.getItem('umkm_pilot_user_session');
      if (isSupabaseConfigured() && session) {
        return 'supabase';
      }
    }
    return 'localStorage';
  },

  async getProducts(mode?: DataSourceMode, businessId?: string): Promise<Product[]> {
    const activeMode = this.resolveMode(mode);
    if (activeMode === 'supabase') {
      return supabaseDataSource.getProducts(businessId);
    }

    return getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  },

  async getActiveProducts(mode?: DataSourceMode, businessId?: string): Promise<Product[]> {
    const products = await this.getProducts(mode, businessId);
    return products.filter((p) => p.isActive);
  },

  async getProductById(id: string, mode?: DataSourceMode, businessId?: string): Promise<Product | undefined> {
    const activeMode = this.resolveMode(mode);
    if (activeMode === 'supabase') {
      return supabaseDataSource.getProductById(id, businessId);
    }
    return (await this.getProducts(mode)).find((p) => p.id === id);
  },

  async createProduct(productData: Omit<Product, 'id'>, mode?: DataSourceMode, businessId?: string): Promise<Product> {
    const activeMode = this.resolveMode(mode);
    if (activeMode === 'supabase') {
      return supabaseDataSource.createProduct(productData, businessId);
    }

    const products = await this.getProducts(mode);
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    products.push(newProduct);
    setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  },

  async updateProduct(id: string, productData: Partial<Omit<Product, 'id'>>, mode?: DataSourceMode, businessId?: string): Promise<Product> {
    const activeMode = this.resolveMode(mode);
    if (activeMode === 'supabase') {
      return supabaseDataSource.updateProduct(id, productData, businessId);
    }

    const products = await this.getProducts(mode);
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Product with ID ${id} not found.`);
    }
    const updatedProduct = { ...products[index], ...productData };
    products[index] = updatedProduct;
    setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    return updatedProduct;
  },

  async deactivateProduct(id: string, mode?: DataSourceMode, businessId?: string): Promise<void> {
    const activeMode = this.resolveMode(mode);
    if (activeMode === 'supabase') {
      await supabaseDataSource.deleteProduct(id, businessId);
      return;
    }
    await this.updateProduct(id, { isActive: false }, mode, businessId);
  },

  async deleteProduct(id: string, mode?: DataSourceMode, businessId?: string): Promise<void> {
    await this.deactivateProduct(id, mode, businessId);
  },

  async updateStock(id: string, newStock: number, mode?: DataSourceMode, businessId?: string): Promise<void> {
    await this.updateProduct(id, { stock: Math.max(0, newStock) }, mode, businessId);
  },

  async adjustStock(id: string, difference: number, mode?: DataSourceMode, businessId?: string): Promise<void> {
    const product = await this.getProductById(id, mode, businessId);
    if (product) {
      await this.updateStock(id, product.stock + difference, mode, businessId);
    }
  },

  async resetProducts(mode?: DataSourceMode): Promise<void> {
    const activeMode = this.resolveMode(mode);
    if (activeMode === 'supabase') {
      console.warn('Reset products not implemented for live Supabase databases to prevent data loss.');
      return;
    }
    setStorageItem(STORAGE_KEYS.PRODUCTS, []);
  }
};
