export type DemoRole = 'admin' | 'cashier' | 'customer';

export interface DemoUser {
  role: DemoRole;
  userName: string;
  userLabel: string;
  lastSelectedAt: string;
}

const DEMO_ROLE_KEY = 'umkm_pilot_demo_role';
const SESSION_KEY = 'umkm_pilot_user_session';

const DEMO_USERS: Record<DemoRole, Omit<DemoUser, 'lastSelectedAt'>> = {
  admin: {
    role: 'admin',
    userName: 'Owner Demo',
    userLabel: 'Pemilik UMKM',
  },
  cashier: {
    role: 'cashier',
    userName: 'Kasir Demo',
    userLabel: 'Kasir',
  },
  customer: {
    role: 'customer',
    userName: 'Customer Demo',
    userLabel: 'Pelanggan',
  },
};

export const demoRoleService = {
  getCurrentDemoRole(): DemoRole {
    if (typeof window === 'undefined') return 'admin';
    const role = window.localStorage.getItem(DEMO_ROLE_KEY) as DemoRole;
    if (role === 'admin' || role === 'cashier' || role === 'customer') {
      return role;
    }
    // Default to admin to preserve dashboard access initially
    return 'admin';
  },

  getCurrentDemoUser(): DemoUser {
    const role = this.getCurrentDemoRole();
    const defaults = DEMO_USERS[role];
    
    let lastSelectedAt = new Date().toISOString();
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(`${DEMO_ROLE_KEY}_meta`);
      if (stored) {
        lastSelectedAt = stored;
      }
    }

    return {
      ...defaults,
      lastSelectedAt,
    };
  },

  setCurrentDemoRole(role: DemoRole): void {
    if (typeof window === 'undefined') return;
    
    // Save to localStorage
    window.localStorage.setItem(DEMO_ROLE_KEY, role);
    window.localStorage.setItem(`${DEMO_ROLE_KEY}_meta`, new Date().toISOString());

    // Synchronize authService session key to prevent login redirection loops
    const defaults = DEMO_USERS[role];
    if (role === 'admin') {
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: 'user-admin-123',
          name: defaults.userName,
          email: 'admin@tokoku.com',
          role: 'admin',
          businessId: 'biz-123',
          businessName: 'Warung Kopi Nusantara',
        })
      );
    } else if (role === 'cashier') {
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: 'user-cashier-456',
          name: defaults.userName,
          email: 'cashier@tokoku.com',
          role: 'cashier',
          businessId: 'biz-123',
          businessName: 'Warung Kopi Nusantara',
        })
      );
    } else {
      // For customer, set a mock customer session profile
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: 'user-customer-789',
          name: defaults.userName,
          email: 'customer@tokoku.com',
          role: 'customer',
          businessId: 'biz-123',
          businessName: 'Warung Kopi Nusantara',
        })
      );
    }
  },

  isAdminRole(): boolean {
    return this.getCurrentDemoRole() === 'admin';
  },

  isCashierRole(): boolean {
    return this.getCurrentDemoRole() === 'cashier';
  },

  isCustomerRole(): boolean {
    return this.getCurrentDemoRole() === 'customer';
  },
};
