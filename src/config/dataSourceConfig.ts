import { isSupabaseConfigured } from '../lib/supabase/client';

export type DataSourceMode = 'localStorage' | 'supabase';

/**
 * Resolves the active data source mode.
 * 
 * Rules:
 * 1. If process.env.NEXT_PUBLIC_DATA_SOURCE is explicitly set to 'localStorage' or 'supabase',
 *    we use that (with a fallback to localStorage if Supabase is not configured).
 * 2. If Supabase env is missing, we use localStorage.
 * 3. In authenticated contexts (isUserAuthenticated = true), we use supabase.
 * 4. In public customer contexts (isPublicView = true), if Supabase is configured, we use supabase.
 * 5. Otherwise, fall back to localStorage (demo mode).
 */
export function getDataSourceMode(isUserAuthenticated: boolean = false, isPublicView: boolean = false): DataSourceMode {
  const envSource = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (envSource === 'localStorage' || envSource === 'supabase') {
    if (envSource === 'supabase' && !isSupabaseConfigured()) {
      return 'localStorage';
    }
    return envSource as DataSourceMode;
  }

  // If Supabase is not configured, always fallback to localStorage
  if (!isSupabaseConfigured()) {
    return 'localStorage';
  }

  // If user is authenticated via Supabase, use supabase
  if (isUserAuthenticated) {
    return 'supabase';
  }

  // If explicitly using public view (e.g., customer ordering), load from Supabase if configured
  if (isPublicView) {
    return 'supabase';
  }

  return 'localStorage';
}
