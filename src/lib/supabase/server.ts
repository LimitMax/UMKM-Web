import { createClient } from '@supabase/supabase-js';

/**
 * Creates a server-side Supabase client.
 * WARNING: This function must only be called in server-side context
 * (API routes, server actions, or Server Components).
 */
export function createSupabaseServerClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseServerClient must only be used on the server side!');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Supabase public environment variables are missing for server client. Returning placeholder client.'
      );
    }
    return createClient(
      supabaseUrl || 'https://placeholder-project-id.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
