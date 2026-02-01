/**
 * Secure CORS Configuration for Supabase Edge Functions
 *
 * SECURITY: This replaces wildcard CORS with whitelist-based origin validation
 * CRITICAL: NEVER use 'Access-Control-Allow-Origin: *' in production
 *
 * @see VULN-007 in security audit
 */

// Production allowed origins (strict whitelist)
const PRODUCTION_ORIGINS = [
  'https://mintenance.com',
  'https://www.mintenance.com',
  'https://app.mintenance.com',
];

// Development origins (only used in non-production environments)
const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:19006', // Expo dev server
  'http://127.0.0.1:3000',
];

/**
 * Get allowed origins based on environment
 */
export function getAllowedOrigins(): string[] {
  const isProd = Deno.env.get('DENO_ENV') === 'production';
  const envOrigin = Deno.env.get('NEXT_PUBLIC_APP_URL');

  let origins = isProd ? [...PRODUCTION_ORIGINS] : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];

  // Add environment-specific origin if not already included
  if (envOrigin && !origins.includes(envOrigin)) {
    origins.push(envOrigin);
  }

  return origins;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

/**
 * Get secure CORS headers for edge function response
 *
 * SECURITY FEATURES:
 * - Whitelist-based origin validation
 * - No wildcard origins
 * - No credentials support (prevents CSRF)
 * - Strict allowed methods
 * - 24-hour preflight cache
 *
 * @param req - Request object to extract origin from
 * @returns HeadersInit object with secure CORS headers
 */
export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Only set Access-Control-Allow-Origin if origin is whitelisted
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (origin) {
    // Log rejected origin attempt (visible in Supabase logs)
    console.warn('[SECURITY] CORS rejected origin:', {
      origin,
      allowedOrigins,
      timestamp: new Date().toISOString(),
    });
  }

  // SECURITY: NEVER set Access-Control-Allow-Credentials
  // This would bypass SameSite cookie protections

  return headers;
}

/**
 * Handle CORS preflight OPTIONS request
 *
 * @param req - Request object
 * @returns Response with CORS headers and 200 status
 */
export function handleCorsPreflight(req: Request): Response {
  const corsHeaders = getCorsHeaders(req);

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Create response with CORS headers
 *
 * @param req - Request object
 * @param body - Response body
 * @param init - Response init options
 * @returns Response with CORS headers
 */
export function createCorsResponse(
  req: Request,
  body: BodyInit | null,
  init?: ResponseInit
): Response {
  const corsHeaders = getCorsHeaders(req);

  return new Response(body, {
    ...init,
    headers: {
      ...init?.headers,
      ...corsHeaders,
    },
  });
}
