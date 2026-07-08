import { getStorageItem, setStorageItem } from './db';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
  businessId: string;
  businessName: string;
}

const SESSION_KEY = 'umkm_pilot_user_session';

const MOCK_PROFILES: { [email: string]: UserProfile } = {
  'admin@tokoku.com': {
    id: 'user-admin-123',
    name: 'Taufiq Ruki (Owner)',
    email: 'admin@tokoku.com',
    role: 'admin',
    businessId: 'biz-123',
    businessName: 'Kopi Tokoku',
  },
  'cashier@tokoku.com': {
    id: 'user-cashier-456',
    name: 'Siti Aminah (Kasir)',
    email: 'cashier@tokoku.com',
    role: 'cashier',
    businessId: 'biz-123',
    businessName: 'Kopi Tokoku',
  },
};

export const authService = {
  getCurrentUser(): UserProfile | null {
    return getStorageItem<UserProfile | null>(SESSION_KEY, null);
  },

  async login(email: string): Promise<UserProfile> {
    // Simulating API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const cleanEmail = email.trim().toLowerCase();
    const profile = MOCK_PROFILES[cleanEmail];

    if (!profile) {
      throw new Error('Email atau kata sandi salah. Gunakan admin@tokoku.com atau cashier@tokoku.com.');
    }

    setStorageItem(SESSION_KEY, profile);
    return profile;
  },

  async register(name: string, email: string, role: 'admin' | 'cashier', businessName: string): Promise<UserProfile> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!name.trim() || !email.trim() || !businessName.trim()) {
      throw new Error('Seluruh kolom formulir wajib diisi.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const newProfile: UserProfile = {
      id: `user-${Date.now()}`,
      name,
      email: cleanEmail,
      role,
      businessId: `biz-${Date.now()}`,
      businessName,
    };

    // Store temporarily in MOCK_PROFILES so they can log in
    MOCK_PROFILES[cleanEmail] = newProfile;
    
    setStorageItem(SESSION_KEY, newProfile);
    return newProfile;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  hasRole(role: 'admin' | 'cashier'): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  },
};
