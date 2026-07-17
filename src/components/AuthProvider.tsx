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
  status?: 'trial' | 'active' | 'suspended' | 'archived' | null;
  suspended_reason?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: SupabaseProfile | null;
  currentBusiness: CurrentBusiness | null;
  role: 'admin' | 'cashier' | 'customer' | 'platform_owner' | null;
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
  const [role, setRole] = useState<'admin' | 'cashier' | 'customer' | 'platform_owner' | null>(null);
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
      console.log('[AuthProvider] loadAuth starting...');
      // Try to load active session from Supabase
      const { data: { session } } = await supabaseClient.auth.getSession();
      const currentUser = session?.user || null;
      console.log('[AuthProvider] loadAuth currentUser: ' + JSON.stringify({
        hasUser: !!currentUser,
        email: currentUser?.email,
      }));

      // Synchronize the session cookie for middleware checks
      if (session) {
        const maxAge = session.expires_in || 3600;
        document.cookie = `sb-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
      } else {
        document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax; Secure';
      }
      if (currentUser) {
        // Fetch profile
        const { data: currentProfile, error: profileErr } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        console.log('[AuthProvider] loadAuth currentProfile: ' + JSON.stringify({
          hasProfile: !!currentProfile,
          error: profileErr ? profileErr.message : null,
          role: currentProfile?.role,
        }));

        if (!profileErr && currentProfile) {
          setUser(currentUser);
          setProfile(currentProfile as SupabaseProfile);
          setRole(currentProfile.role);

          // Platform owners have no associated business — skip business fetch
          if (currentProfile.role === 'platform_owner' || !currentProfile.business_id) {
            setCurrentBusiness(null);
          } else {
            const { data: businessData, error: businessErr } = await supabaseClient
              .from('businesses')
              .select('*')
              .eq('id', currentProfile.business_id)
              .maybeSingle();

            if (!businessErr && businessData) {
              const biz = businessData as CurrentBusiness;
              
              // Direct block checks for current active sessions:
              if (biz.status === 'archived') {
                // Terminate session for all users if business is archived
                await authService.signOut();
                setUser(null);
                setProfile(null);
                setCurrentBusiness(null);
                setRole(null);
                return;
              }
              if (biz.status === 'suspended' && currentProfile.role === 'cashier') {
                // Terminate session for cashier if business is suspended
                await authService.signOut();
                setUser(null);
                setProfile(null);
                setCurrentBusiness(null);
                setRole(null);
                return;
              }

              setCurrentBusiness(biz);
            } else {
              setCurrentBusiness(null);
            }
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
    if (!configured) {
      setTimeout(() => {
        loadAuth();
      }, 0);
      return;
    }

    // Subscribe to live auth events
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] onAuthStateChange event:', event, !!session);
      
      // Sync cookie
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session) {
          const maxAge = session.expires_in || 3600;
          document.cookie = `sb-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
        }
      } else if (event === 'SIGNED_OUT') {
        document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax; Secure';
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION'
      ) {
        setTimeout(() => {
          loadAuth();
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
    
    // Clear session cookie
    document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax; Secure';

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
