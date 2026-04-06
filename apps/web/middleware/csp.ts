/**
 * Content-Security-Policy headers for middleware.
 * Extracted from middleware.ts.
 *
 * IMPORTANT: We use 'unsafe-inline' WITHOUT a nonce. Next.js injects inline
 * hydration scripts that don't carry nonces, and CSP3 browsers ignore
 * 'unsafe-inline' when a nonce is present — which would break hydration.
 */

const CONNECT_SRC_DEV =
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://maps.googleapis.com http://localhost:* http://127.0.0.1:* ws: wss:";

const CONNECT_SRC_PROD =
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://maps.googleapis.com https://vercel.live wss: wss://ws-us3.pusher.com";

const CONNECT_SRC_PUBLIC =
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://maps.googleapis.com https://vercel.live wss://ws-us3.pusher.com";

/**
 * Enforced CSP for public (unauthenticated) routes.
 * Only emitted in production; dev uses the browser default.
 */
export function buildPublicCSP(): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    CONNECT_SRC_PUBLIC,
    'frame-src https://js.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://www.openstreetmap.org https://vercel.live',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Enforced CSP for authenticated routes. Uses dev connect-src in development
 * to allow localhost and websocket connections.
 */
export function buildAuthenticatedCSP(isDevelopment: boolean): string {
  const connectSrc = isDevelopment ? CONNECT_SRC_DEV : CONNECT_SRC_PROD;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    connectSrc,
    'frame-src https://js.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://www.openstreetmap.org https://vercel.live',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Stricter CSP delivered as Report-Only so we can monitor future enforcement.
 * Drops vercel.live from script-src and frame-src and adds report-uri.
 */
export function buildStrictReportOnlyCSP(isDevelopment: boolean): string {
  const connectSrc = isDevelopment ? CONNECT_SRC_DEV : CONNECT_SRC_PROD;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    connectSrc,
    'frame-src https://js.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://www.openstreetmap.org',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'report-uri /api/csp-report',
  ].join('; ');
}
