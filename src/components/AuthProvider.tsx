'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { authService } from '../lib/services/authService';
import { SupabaseProfile } from '../lib/services/profileService';
import { supabaseClient } from '../lib/supabase/client';

export interface CurrentBusiness {
  id: string;
  name: string;
  business_type: string | null;
  slug: string | null;
  public_order_enabled: boolean | null;
  description?: string | null;
  logo_url?: string | null;
  address?: string | null;
  whatsapp_number?: string | null;
  opening_hours?: string | null;
  tax_enabled?: boolean | null;
  tax_percentage?: number | string | null;
  service_charge_enabled?: boolean | null;
  service_charge_percentage?: number | string | null;
  delivery_settings?: Record<string, unknown> | null;
  eta_settings?: Record<string, unknown> | null;
  plan_code?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  midtrans_server_key?: string | null;
  midtrans_client_key?: string | null;
  midtrans_merchant_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: SupabaseProfile | null;
  currentBusiness: CurrentBusiness | null;
  role: 'admin' | 'cashier' | 'customer' | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<CurrentBusiness | null>(null);
  const [role, setRole] = useState<'admin' | 'cashier' | 'customer' | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  const loadAuth = useCallback(async () => {
    if (!configured) {
      setUser(null);
      setProfile(null);
      setCurrentBusiness(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // Try to load active user from Supabase
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
      if (currentUser) {
        // Fetch profile
        const { data: currentProfile, error: profileErr } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (!profileErr && currentProfile) {
          setUser(currentUser);
          setProfile(currentProfile as SupabaseProfile);
          setRole(currentProfile.role);

          const { data: businessData, error: businessErr } = await supabaseClient
            .from('businesses')
            .select('*')
            .eq('id', currentProfile.business_id)
            .maybeSingle();

          if (!businessErr && businessData) {
            setCurrentBusiness(businessData as CurrentBusiness);
          } else {
            setCurrentBusiness(null);
          }
        } else {
          // Fallback if auth exists but profile row is missing
          setUser(currentUser);
          setProfile(null);
          setCurrentBusiness(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setCurrentBusiness(null);
        setRole(null);
      }
    } catch (err) {
      console.error('Error loading Supabase auth state:', err);
      setUser(null);
      setProfile(null);
      setCurrentBusiness(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    // Call loadAuth asynchronously to prevent synchronous cascading renders
    const timer = setTimeout(() => {
      loadAuth();
    }, 0);

    if (configured) {
      // Subscribe to live auth events
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          setTimeout(() => {
            loadAuth();
          }, 0);
        }
      });

      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    } else {
      return () => {
        clearTimeout(timer);
      };
    }
  }, [configured, loadAuth]);

  const signOut = async () => {
    setLoading(true);
    if (configured) {
      try {
        await authService.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    
    // Clear state
    setUser(null);
    setProfile(null);
    setCurrentBusiness(null);
    setRole(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        currentBusiness,
        role,
        loading,
        isSupabaseConfigured: configured,
        signOut,
        refreshAuth: loadAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
