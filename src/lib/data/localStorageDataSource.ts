import { Product, Order, BusinessProfile } from '../../types';
import { DataSource } from './dataSource';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../../services/db';
import { BUSINESS_PROFILE_KEY, DEFAULT_BUSINESS_PROFILE, DEFAULT_DELIVERY_SETTINGS, DEFAULT_ETA_SETTINGS } from '../../services/businessService';

/**
 * LocalStorage data driver implementation.
 * Maps exact operations to existing browser storage services.
 */
export const localStorageDataSource: DataSource = {
  async getBusinessProfile(): Promise<BusinessProfile> {
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

  async updateBusinessProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const current = await this.getBusinessProfile();
    const updated = {
      ...current,
      ...profile,
    };
    setStorageItem(BUSINESS_PROFILE_KEY, updated);
    return updated;
  },

  async getProducts(): Promise<Product[]> {
    return getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return (await this.getProducts()).find((p) => p.id === id);
  },

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
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
    const products = await this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    setStorageItem(STORAGE_KEYS.PRODUCTS, filtered);
  },

  async getOrders(): Promise<Order[]> {
    return getStorageItem<Order[]>(STORAGE_KEYS.ORDERS, []);
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    return (await this.getOrders()).find((o) => o.id === id);
  },

  async createOrder(orderData: Omit<Order, 'id' | 'queueNumber' | 'createdAt'>): Promise<Order> {
    const orders = await this.getOrders();
    
    // Generate new queue index
    const queueIndex = getStorageItem<number>(STORAGE_KEYS.QUEUE, 0) + 1;
    setStorageItem(STORAGE_KEYS.QUEUE, queueIndex);
    const queueLetter = orderData.fulfillmentType === 'delivery' ? 'D' : 'A';
    const queueNumber = `${queueLetter}${String(queueIndex).padStart(3, '0')}`;
    
    const newOrder: Order = {
      ...orderData,
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queueNumber,
      createdAt: new Date().toISOString(),
    };
    
    orders.push(newOrder);
    setStorageItem(STORAGE_KEYS.ORDERS, orders);
    return newOrder;
  },

  async updateOrderStatus(id: string, status: Order['status'], paymentStatus?: Order['paymentStatus']): Promise<Order> {
    const orders = await this.getOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new Error(`Order with ID ${id} not found.`);
    }
    
    const currentOrder = orders[index];
    const updateData: Partial<Order> = { status };
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    
    if (status === 'Paid') {
      updateData.paidAt = new Date().toISOString();
      updateData.paymentStatus = 'Paid';
    } else if (status === 'Completed') {
      updateData.completedAt = new Date().toISOString();
    } else if (status === 'Cancelled') {
      updateData.cancelledAt = new Date().toISOString();
    }
    
    const updatedOrder = {
      ...currentOrder,
      ...updateData,
    };
    
    orders[index] = updatedOrder;
    setStorageItem(STORAGE_KEYS.ORDERS, orders);
    return updatedOrder;
  },

  async updateOrderEta(id: string, deltaMinutes: number, reason: string): Promise<Order> {
    const orders = await this.getOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new Error(`Order with ID ${id} not found.`);
    }
    
    const currentOrder = orders[index];
    const currentTotal = currentOrder.estimatedTotalMinutes || 15;
    const newTotal = Math.max(5, currentTotal + deltaMinutes);
    
    let estimatedReadyAt = currentOrder.estimatedReadyAt;
    let estimatedArrivalAt = currentOrder.estimatedArrivalAt;
    
    const baseTime = currentOrder.etaUpdatedAt 
      ? new Date(currentOrder.etaUpdatedAt) 
      : new Date(currentOrder.createdAt);
      
    if (currentOrder.fulfillmentType === 'delivery') {
      const prepMinutes = currentOrder.estimatedPreparationMinutes || 15;
      const deliveryMinutes = currentOrder.estimatedDeliveryMinutes || 10;
      const newPrep = Math.max(5, prepMinutes + deltaMinutes);
      
      const readyDate = new Date(baseTime.getTime() + newPrep * 60000);
      const arrivalDate = new Date(readyDate.getTime() + deliveryMinutes * 60000);
      
      estimatedReadyAt = readyDate.toISOString();
      estimatedArrivalAt = arrivalDate.toISOString();
    } else {
      const readyDate = new Date(baseTime.getTime() + newTotal * 60000);
      estimatedReadyAt = readyDate.toISOString();
    }
    
    const updatedOrder: Order = {
      ...currentOrder,
      estimatedTotalMinutes: newTotal,
      estimatedReadyAt,
      estimatedArrivalAt,
      etaLabel: `${newTotal} menit`,
      etaUpdatedAt: new Date().toISOString(),
      etaManuallyAdjusted: true,
      etaAdjustmentReason: reason,
    };
    
    orders[index] = updatedOrder;
    setStorageItem(STORAGE_KEYS.ORDERS, orders);
    return updatedOrder;
  },
};
