import { Product, Order, BusinessProfile } from '../../types';
import { localStorageDataSource } from './localStorageDataSource';
import { supabaseDataSource } from './supabaseDataSource';
import { USE_SUPABASE } from '../../config/dbConfig';

export interface DataSource {
  // Business Profile operations
  getBusinessProfile(): Promise<BusinessProfile>;
  updateBusinessProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(productData: Omit<Product, 'id'>): Promise<Product>;
  updateProduct(id: string, productData: Partial<Omit<Product, 'id'>>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Order operations
  getOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(orderData: Omit<Order, 'id' | 'queueNumber' | 'createdAt'>): Promise<Order>;
  updateOrderStatus(id: string, status: Order['status'], paymentStatus?: Order['paymentStatus']): Promise<Order>;
  updateOrderEta(id: string, deltaMinutes: number, reason: string): Promise<Order>;
}

/**
 * Unified switchboard for the application's active data driver.
 *
 * NOTE: Currently, localStorageDataSource remains the active driver by default
 * to preserve full offline demo mode. supabaseDataSource will be fully activated
 * in subsequent phases (Phase 7C/7D).
 */
export const activeDataSource: DataSource = USE_SUPABASE
  ? supabaseDataSource
  : localStorageDataSource;
