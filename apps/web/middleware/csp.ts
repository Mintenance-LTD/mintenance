/**
 * Content-Security-Policy headers for middleware.
 * Extracted from middleware.ts.
 *
 * Two modes, gated by `process.env.ENABLE_CSP_NONCE`:
 *
 *   default ("legacy" mode) — script-src carries 'unsafe-inline' with NO
 *   nonce. Next.js injects inline hydration scripts that don't carry
 *   nonces, and CSP3 browsers ignore 'unsafe-inline' when a nonce is
 *   present — so adding a nonce without updating the layout would break
 *   hydration. This is the safe default until the layout is wired.
 *
 *   ENABLE_CSP_NONCE=true ("strict" mode) — script-src emits a per-request
 *   `'nonce-<value>' 'strict-dynamic'` and drops `'unsafe-inline'`. To
 *   ship this without breaking hydration, the app root layout MUST read
 *   the `x-csp-nonce` request header (already set by middleware.ts) and
 *   forward it to inline `<Script>` and `<script>` tags. Staged rollout:
 *     1. flip the flag on a preview deployment
 *     2. monitor /api/csp-report for 24-48h for violations
 *     3. patch any inline script missing the nonce forwarding
 *     4. promote to production
 */

function isNonceMode(): boolean {
  return process.env.ENABLE_CSP_NONCE === 'true';
}

function buildScriptSrc(
  nonce: string | undefined,
  extraHosts: string[]
): string {
  const baseHosts = extraHosts.join(' ');
  if (isNonceMode() && nonce) {
    // Modern browsers honor the nonce + strict-dynamic, ignoring
    // 'unsafe-inline'. Legacy browsers fall back to 'unsafe-inline' so
    // the site continues to work during a gradual rollout.
    return `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' ${baseHosts}`;
  }
  return `script-src 'self' 'unsafe-inline' ${baseHosts}`;
}

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
export function buildPublicCSP(nonce?: string): string {
  return [
    "default-src 'self'",
    buildScriptSrc(nonce, [
      'https://js.stripe.com',
      'https://maps.googleapis.com',
      'https://vercel.live',
    ]),
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
export function buildAuthenticatedCSP(
  isDevelopment: boolean,
  nonce?: string
): string {
  const connectSrc = isDevelopment ? CONNECT_SRC_DEV : CONNECT_SRC_PROD;
  return [
    "default-src 'self'",
    buildScriptSrc(nonce, [
      'https://js.stripe.com',
      'https://maps.googleapis.com',
      'https://vercel.live',
    ]),
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
export function buildStrictReportOnlyCSP(
  isDevelopment: boolean,
  nonce?: string
): string {
  const connectSrc = isDevelopment ? CONNECT_SRC_DEV : CONNECT_SRC_PROD;
  return [
    "default-src 'self'",
    buildScriptSrc(nonce, [
      'https://js.stripe.com',
      'https://maps.googleapis.com',
    ]),
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
