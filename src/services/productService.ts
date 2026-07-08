import { Product } from '../types';
import { getStorageItem, setStorageItem, STORAGE_KEYS, initializeDB } from './db';
import { USE_SUPABASE } from '../config/dbConfig';
import { supabase } from '../lib/supabase';

export const productService = {
  async getProducts(): Promise<Product[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        console.error('Supabase getProducts error:', error.message);
        throw error;
      }
      return data || [];
    }

    const products = getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    if (products.length === 0) {
      initializeDB();
      return getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    }
    return products;
  },

  async getActiveProducts(): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter((p) => p.isActive);
  },

  async getProductById(id: string): Promise<Product | undefined> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Supabase getProductById error:', error.message);
        return undefined;
      }
      return data;
    }
    return (await this.getProducts()).find((p) => p.id === id);
  },

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
      if (error) {
        console.error('Supabase createProduct error:', error.message);
        throw error;
      }
      return data;
    }

    const products = await this.getProducts();
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    products.push(newProduct);
    setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  },

  async updateProduct(id: string, productData: Partial<Omit<Product, 'id'>>): Promise<Product> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('Supabase updateProduct error:', error.message);
        throw error;
      }
      return data;
    }

    const products = await this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Product with ID ${id} not found.`);
    }
    const updatedProduct = { ...products[index], ...productData };
    products[index] = updatedProduct;
    setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    return updatedProduct;
  },

  async deleteProduct(id: string): Promise<void> {
    if (USE_SUPABASE) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Supabase deleteProduct error:', error.message);
        throw error;
      }
      return;
    }

    const products = await this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    setStorageItem(STORAGE_KEYS.PRODUCTS, filtered);
  },

  async updateStock(id: string, newStock: number): Promise<void> {
    await this.updateProduct(id, { stock: Math.max(0, newStock) });
  },

  async adjustStock(id: string, difference: number): Promise<void> {
    const product = await this.getProductById(id);
    if (product) {
      await this.updateStock(id, product.stock + difference);
    }
  },
};
