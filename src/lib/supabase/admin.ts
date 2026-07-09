import { createClient } from '@supabase/supabase-js';

/**
 * Creates a server-side admin Supabase client using the private service role key.
 * WARNING: This client bypasses all Row-Level Security (RLS) policies.
 * MUST ONLY be called in server-side context. Never export this key or import this file on the client!
 */
export function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseAdminClient must only be used on the server side!');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Supabase service role config is missing. Returning a placeholder admin client.'
      );
    }
    return createClient(
      supabaseUrl || 'https://placeholder-project-id.supabase.co',
      supabaseServiceRoleKey || 'placeholder-service-role-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
