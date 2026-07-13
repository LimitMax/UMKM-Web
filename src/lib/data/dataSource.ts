import { Product, Order, BusinessProfile } from '../../types';
import { localStorageDataSource } from './localStorageDataSource';
import { supabaseDataSource } from './supabaseDataSource';
import { USE_SUPABASE } from '../../config/dbConfig';

export interface DataSource {
  // Business Profile operations
  getBusinessProfile(businessId?: string): Promise<BusinessProfile>;
  updateBusinessProfile(profile: Partial<BusinessProfile>, businessId?: string): Promise<BusinessProfile>;

  // Product operations
  getProducts(businessId?: string): Promise<Product[]>;
  getProductById(id: string, businessId?: string): Promise<Product | undefined>;
  createProduct(productData: Omit<Product, 'id'>, businessId?: string): Promise<Product>;
  updateProduct(id: string, productData: Partial<Omit<Product, 'id'>>, businessId?: string): Promise<Product>;
  deleteProduct(id: string, businessId?: string): Promise<void>;

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
 * Unified data access should use Supabase in production UAT. The localStorage
 * driver is kept only as an explicit development adapter.
 */
export const activeDataSource: DataSource = USE_SUPABASE
  ? supabaseDataSource
  : localStorageDataSource;
