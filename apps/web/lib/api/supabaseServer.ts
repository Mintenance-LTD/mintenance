import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';

// Read env vars lazily at client creation time (not module load time).
// Module-level constants can capture stale/placeholder values during
// Vercel serverless cold starts or Next.js build-time page collection.
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
  return url;
}
function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Server operations will fail without the service role key.');
  }
  return key;
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
      // 10-second server-side timeout prevents hung Supabase connections
      // from causing the mobile client's 30-second AbortController to fire.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      // Propagate any existing abort signal (e.g. from Next.js request cancellation)
      if (options?.signal) {
        const upstream = options.signal as AbortSignal;
        if (upstream.aborted) {
          controller.abort();
        } else {
          upstream.addEventListener('abort', () => controller.abort(), { once: true });
        }
      }
      return fetch(url, {
        ...options,
        signal: controller.signal,
        keepalive: true,
      }).finally(() => clearTimeout(timeoutId));
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
 * Lazily-initialized service-role Supabase client singleton.
 * Created on first property access (not module load) so env vars
 * are guaranteed to be available on Vercel serverless cold starts.
 *
 * SECURITY WARNING: Bypasses ALL RLS policies.
 * Only use for operations that genuinely require elevated privileges.
 */
let _serverSupabase: SupabaseClient | null = null;

function getServerSupabaseInstance(): SupabaseClient {
  if (!_serverSupabase) {
    _serverSupabase = createClient(getSupabaseUrl(), getSupabaseServiceKey(), clientOptions);
  }
  return _serverSupabase;
}

// Proxy preserves backward compatibility: callers use `serverSupabase.from(...)`
// as before, but the underlying client is created lazily on first access.
export const serverSupabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getServerSupabaseInstance();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as Function).bind(client);
    }
    return value;
  },
});

/**
 * Create a new service-role client instance for isolated operations.
 * SECURITY WARNING: Bypasses ALL RLS — prefer createUserScopedClient() for user requests.
 */
export function createServerSupabaseClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey(), clientOptions as unknown as Parameters<typeof createClient>[2]);
}

/**
 * Create a Supabase client scoped to the requesting user via their JWT.
 * This client respects RLS policies and should be used for all user-facing API routes.
 */
export function createUserScopedClient(userJwt: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for user-scoped client');
  }
  return createClient(getSupabaseUrl(), anonKey, {
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
