import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
} from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

// Read env vars lazily at client creation time (not module load time).
// Module-level constants can capture stale/placeholder values during
// Vercel serverless cold starts or Next.js build-time page collection.
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL environment variable.'
    );
  }
  return url;
}
function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      '[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Server operations will fail without the service role key.'
    );
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
          upstream.addEventListener('abort', () => controller.abort(), {
            once: true,
          });
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
    _serverSupabase = createClient(
      getSupabaseUrl(),
      getSupabaseServiceKey(),
      clientOptions
    );
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
  return createClient(
    getSupabaseUrl(),
    getSupabaseServiceKey(),
    clientOptions as unknown as Parameters<typeof createClient>[2]
  );
}

/**
 * Create a Supabase client scoped to the requesting user via their JWT.
 * This client respects RLS policies and should be used for all user-facing API routes.
 */
export function createUserScopedClient(userJwt: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      '[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for user-scoped client'
    );
  }
  return createClient(getSupabaseUrl(), anonKey, {
    ...(clientOptions as unknown as Parameters<typeof createClient>[2]),
    global: {
      ...clientOptions.global,
      headers: {
        ...clientOptions.global?.headers,
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
}

/**
 * Extract the raw JWT from an incoming API request.
 * Checks Bearer token first (mobile clients), then falls back to
 * the Supabase auth cookie (web clients using Supabase Auth).
 *
 * Returns null if no valid token source is found — callers should
 * fall back to serverSupabase (service role) when this returns null,
 * since the user was already authenticated by withApiHandler.
 */
export function getUserJwtFromRequest(request: NextRequest): string | null {
  // 1. Bearer token (mobile clients send Supabase JWTs)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token) return token;
  }

  // 2. Supabase auth cookie (web clients authenticated via Supabase Auth)
  //    Cookie name format: sb-<project-ref>-auth-token
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  if (ref) {
    // @supabase/ssr stores session as base64-encoded JSON chunks
    // The access_token is inside the decoded JSON object
    const cookieValue = request.cookies.get(`sb-${ref}-auth-token`)?.value;
    if (cookieValue) {
      try {
        const session = JSON.parse(cookieValue);
        if (session?.access_token) return session.access_token;
      } catch {
        // Cookie might be in chunked format (sb-<ref>-auth-token.0, .1, etc.)
        // or just the token itself
      }
    }
    // Try chunked cookie format
    let chunked = '';
    for (let i = 0; i < 10; i++) {
      const chunk = request.cookies.get(`sb-${ref}-auth-token.${i}`)?.value;
      if (!chunk) break;
      chunked += chunk;
    }
    if (chunked) {
      try {
        const session = JSON.parse(chunked);
        if (session?.access_token) return session.access_token;
      } catch {
        // Not valid JSON
      }
    }
  }

  return null;
}

/**
 * Create a Supabase client that respects RLS for the current request.
 *
 * This is the preferred way to get a user-scoped client inside API route handlers.
 * It extracts the JWT from the request (Bearer token or Supabase cookie) and creates
 * a client with the anon key + user's JWT so all queries go through RLS.
 *
 * Falls back to serverSupabase (service role) if no user token is found,
 * which should only happen if the route allows unauthenticated access.
 *
 * @param request - The NextRequest object from the route handler
 * @returns A Supabase client scoped to the user (RLS-enforced), or null if no JWT found
 */
export function createRequestScopedClient(
  request: NextRequest
): SupabaseClient | null {
  const jwt = getUserJwtFromRequest(request);
  if (!jwt) return null;
  return createUserScopedClient(jwt) as SupabaseClient;
}

/**
 * Sprint 7 (3.3): Resolve a DB client for a request with explicit awareness
 * of whether RLS is in effect.
 *
 * The historical pattern is:
 *    const userDb = createRequestScopedClient(request) ?? serverSupabase;
 * which silently falls back to service-role when the request auths via our
 * custom JWT cookie (not a Supabase session). Routes that forget to also
 * apply an explicit `.eq('owner_id', user.id)` filter leak cross-tenant
 * data whenever that fallback fires.
 *
 * This helper returns a tagged result so callers can branch on
 * `enforcesRls` and know they MUST apply app-level filters when it is
 * false. We also emit a low-volume telemetry warning on fallback, so
 * operators can see how often service-role kicks in per route.
 */
export interface ResolvedRequestClient {
  db: SupabaseClient;
  /** true = Supabase RLS applies. false = service-role; caller MUST filter. */
  enforcesRls: boolean;
}

export function resolveRequestDbClient(
  request: NextRequest,
  opts: { route?: string } = {}
): ResolvedRequestClient {
  const jwt = getUserJwtFromRequest(request);
  if (jwt) {
    return {
      db: createUserScopedClient(jwt) as SupabaseClient,
      enforcesRls: true,
    };
  }

  // No Supabase JWT (user likely authed via our custom JWT cookie).
  // Dynamic import to avoid bundling logger in every caller.
  import('@mintenance/shared')
    .then(({ logger }) => {
      logger.warn(
        'DB access falling back to service role — caller must apply explicit filters',
        {
          service: 'supabaseServer',
          route: opts.route ?? request.nextUrl.pathname,
        }
      );
    })
    .catch(() => {
      // swallow: logging must never block the request path
    });

  return {
    db: serverSupabase,
    enforcesRls: false,
  };
}

/**
 * Sprint 7 (3.3): Strict variant — returns a user-scoped RLS-enforced
 * client or THROWS. Use in routes where you are certain the caller
 * should always have a Supabase JWT available (e.g. mobile-only APIs,
 * or explicitly Supabase-Auth pages). Never falls back to service role.
 */
export function requireUserScopedClient(request: NextRequest): SupabaseClient {
  const jwt = getUserJwtFromRequest(request);
  if (!jwt) {
    throw new Error(
      'requireUserScopedClient: no Supabase JWT on request. This route ' +
        'refuses service-role fallback. If the caller authed via our custom ' +
        'JWT cookie, use createRequestScopedClient() + explicit filters instead.'
    );
  }
  return createUserScopedClient(jwt) as SupabaseClient;
}

/**
 * Create a Supabase client with the anon key for operations that need
 * to establish a user session (e.g., password reset via access token).
 * Unlike createUserScopedClient, this does NOT set an Authorization header,
 * allowing callers to use auth.setSession() to authenticate.
 */
export function createAnonClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      '[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for anon client'
    );
  }
  return createClient(
    getSupabaseUrl(),
    anonKey,
    clientOptions as unknown as Parameters<typeof createClient>[2]
  );
}
