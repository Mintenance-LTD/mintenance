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

/**
 * SECURITY WARNING: This client uses SUPABASE_SERVICE_ROLE_KEY and bypasses ALL RLS policies.
 * Only use for operations that genuinely require elevated privileges (webhooks, admin tasks,
 * background jobs). For user-scoped queries, use createUserScopedClient() instead.
 */
export const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, clientOptions);

/**
 * Create a new service-role client instance for isolated operations.
 * SECURITY WARNING: Bypasses ALL RLS — prefer createUserScopedClient() for user requests.
 */
export function createServerSupabaseClient(): ReturnType<typeof createClient> {
  return createClient(supabaseUrl!, supabaseServiceKey!, clientOptions as unknown as Parameters<typeof createClient>[2]);
}

/**
 * Create a Supabase client scoped to the requesting user via their JWT.
 * This client respects RLS policies and should be used for all user-facing API routes.
 */
export function createUserScopedClient(userJwt: string): ReturnType<typeof createClient> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for user-scoped client');
  }
  return createClient(supabaseUrl!, anonKey, {
    ...clientOptions as unknown as Parameters<typeof createClient>[2],
    global: {
      ...clientOptions.global,
      headers: {
        ...clientOptions.global?.headers,
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
}

