import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please set this in your .env.local file. ' +
    'For local development: http://127.0.0.1:54321'
  );
}

if (!supabaseServiceKey) {
  throw new Error(
    '[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
    'Please set this in your .env.local file. ' +
    'This is the service role key from your Supabase project settings. ' +
    'NEVER commit this key to version control.'
  );
}

/**
 * Supabase client configuration optimized for server-side usage
 *
 * Connection Pooling:
 * - Supabase uses Supavisor for connection pooling
 * - The pooler is automatically used when connecting via the Supabase client
 * - For direct database connections, use the pooler URL from Supabase dashboard
 *
 * Performance optimizations:
 * - Disabled auto-refresh (not needed for server-side)
 * - Disabled session persistence (not needed for server-side)
 * - Fetch options for connection reuse
 */
const clientOptions: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    // Connection reuse and timeout settings
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        // Enable connection keep-alive for HTTP/2 multiplexing
        keepalive: true,
      });
    },
    headers: {
      // Add connection hints for better pooler behavior
      'x-connection-encrypted': 'true',
    },
  },
  // Realtime disabled for server-side to reduce connections
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
};

// Singleton service-role client. Never import this in client-side code.
export const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, clientOptions);

/**
 * Create a new client instance for isolated operations
 * Use this when you need a fresh connection (e.g., for long-running operations)
 */
export function createServerSupabaseClient(): ReturnType<typeof createClient> {
  return createClient(supabaseUrl, supabaseServiceKey, clientOptions);
}

