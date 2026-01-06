/**
 * Supabase Client (Browser/Client-side)
 * 
 * This client uses the public anon key and is safe to use in browser contexts.
 * For server-side operations with elevated privileges, use serverSupabase from
 * '@/lib/api/supabaseServer' instead.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side-rendering
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Validates Supabase environment configuration
 * Throws in production, warns in development, silent during build
 */
function validateSupabaseConfig(): { isValid: boolean; isBuildTime: boolean } {
  const isBuildTime = 
    process.env.NEXT_PHASE === 'phase-production-build' || 
    process.env.NEXT_PHASE === 'phase-development-build';

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isBuildTime && process.env.NODE_ENV === 'production') {
      // CRITICAL: Fail fast in production - missing config is a deployment error
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      
      throw new Error(
        `[Supabase] Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Ensure these are set in your production environment (Vercel, etc.).'
      );
    } else if (!isBuildTime) {
      // Development: Allow graceful degradation with warning
      logger.warn('[Supabase] Missing env configuration; using placeholder client for development. ' +
        'Database operations will fail. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    }
    return { isValid: false, isBuildTime };
  }

  return { isValid: true, isBuildTime };
}

const { isValid } = validateSupabaseConfig();

/**
 * Browser-safe Supabase client instance
 * Uses public anon key with Row Level Security (RLS) enforcement
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Whether Supabase is properly configured
 * Use this to conditionally render features that require database access
 */
export const isSupabaseConfigured: boolean = isValid;
