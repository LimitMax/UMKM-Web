// Toggle flag to switch active database drivers between localStorage and Supabase.
// In the future, simply set NEXT_PUBLIC_USE_SUPABASE=true in your .env file to migrate.
export const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
