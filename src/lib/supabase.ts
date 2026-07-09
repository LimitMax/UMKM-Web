import { supabaseClient } from './supabase/client';

// Re-export the client-safe instance for backwards compatibility
export const supabase = supabaseClient;
