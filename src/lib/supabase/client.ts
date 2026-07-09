import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Client-safe Supabase instance for browser usage
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to check if Supabase is properly configured in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (url.includes('placeholder-project-id') || anonKey.includes('placeholder-anon-key')) return false;

  return true;
}
