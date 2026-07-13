import { Product } from '../types';

export const STORAGE_KEYS = {
  PRODUCTS: 'umkm_pilot_products',
  ORDERS: 'umkm_pilot_orders',
  QUEUE: 'umkm_pilot_queue_index',
};

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Es Kopi Susu Gula Aren',
    category: 'Minuman',
    price: 18000,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'prod-2',
    name: 'Nasi Ayam Geprek Level 5',
    category: 'Makanan',
    price: 22000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'prod-3',
    name: 'Mie Goreng Spesial + Telur',
    category: 'Makanan',
    price: 15000,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'prod-4',
    name: 'Roti Bakar Cokelat Keju',
    category: 'Snack',
    price: 14000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1584776296984-48cd02b0c497?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'prod-5',
    name: 'Es Teh Manis Jumbo',
    category: 'Minuman',
    price: 6000,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'prod-6',
    name: 'Kopi Hitam Mandheling',
    category: 'Minuman',
    price: 12000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'prod-7',
    name: 'Paket Kenyang A (Geprek + Es Teh)',
    category: 'Paket Promo',
    price: 25000,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
];

export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting key "${key}" to localStorage:`, error);
  }
}

export function initializeDB(): void {
  if (typeof window === 'undefined') return;
  const products = window.localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!products) {
    setStorageItem(STORAGE_KEYS.PRODUCTS, []);
  }
  const orders = window.localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (!orders) {
    setStorageItem(STORAGE_KEYS.ORDERS, []);
  }
  const queue = window.localStorage.getItem(STORAGE_KEYS.QUEUE);
  if (!queue) {
    setStorageItem(STORAGE_KEYS.QUEUE, 0);
  }
}

export function resetDB(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  window.localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  window.localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(0));
}

// STORAGE_KEYS and SEED_PRODUCTS are exported inline above
