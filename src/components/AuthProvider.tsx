'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { authService } from '../lib/services/authService';
import { SupabaseProfile } from '../lib/services/profileService';
import { demoRoleService } from '../services/demoRoleService';
import { supabaseClient } from '../lib/supabase/client';

interface AuthContextType {
  user: User | null;
  profile: SupabaseProfile | null;
  role: 'admin' | 'cashier' | 'customer' | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  isDemoMode: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [role, setRole] = useState<'admin' | 'cashier' | 'customer' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const configured = isSupabaseConfigured();

  const loadAuth = useCallback(async () => {
    if (!configured) {
      // Supabase is not configured, run in demo mode
      const demoRole = demoRoleService.getCurrentDemoRole();
      setRole(demoRole);
      setUser(null);
      setProfile(null);
      setIsDemoMode(true);
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
          setIsDemoMode(false);
        } else {
          // Fallback if auth exists but profile row is missing
          setUser(currentUser);
          setProfile(null);
          setRole(null);
          setIsDemoMode(false);
        }
      } else {
        // User not logged in, fall back to demo mode settings
        const demoRole = demoRoleService.getCurrentDemoRole();
        setRole(demoRole);
        setUser(null);
        setProfile(null);
        setIsDemoMode(true);
      }
    } catch (err) {
      console.error('Error loading Supabase auth state:', err);
      // Fail-safe to demo mode
      const demoRole = demoRoleService.getCurrentDemoRole();
      setRole(demoRole);
      setUser(null);
      setProfile(null);
      setIsDemoMode(true);
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
      // Offline mode: listen to local storage storage events
      const handleStorageChange = () => {
        const demoRole = demoRoleService.getCurrentDemoRole();
        setTimeout(() => {
          setRole(demoRole);
        }, 0);
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Also poll local storage to handle role swaps inside the same tab
      const interval = setInterval(() => {
        const demoRole = demoRoleService.getCurrentDemoRole();
        setRole(demoRole);
      }, 800);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
  }, [configured, loadAuth]);

  const signOut = async () => {
    setLoading(true);
    if (configured && !isDemoMode) {
      try {
        await authService.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    } else {
      // Clear mock session in local storage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('umkm_pilot_user_session');
      }
    }
    
    // Clear state and reload settings
    setUser(null);
    setProfile(null);
    const demoRole = demoRoleService.getCurrentDemoRole();
    setRole(demoRole);
    setIsDemoMode(true);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isSupabaseConfigured: configured,
        isDemoMode,
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
