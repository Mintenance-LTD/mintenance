/**
 * Public-route classification for middleware.
 *
 * Extracted from middleware.ts. A route is considered public when it needs
 * no authentication — login, register, info pages, marketing, public API
 * endpoints, public contractor profile pages (UUID-only), etc.
 *
 * SECURITY NOTE: adding paths here exposes them to unauthenticated traffic.
 * The contractor-profile regex deliberately matches ONLY UUID-formatted
 * paths to prevent bypasses like `/contractor/settings` or
 * `/contractor/dashboard-enhanced`.
 */

/** Public page routes (prefix-matched with `/` separator). */
const PUBLIC_PAGE_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/help',
  '/logout',
  '/careers',
  '/press',
  '/safety',
  '/cookies',
  '/faq',
  '/blog',
  '/pricing',
  '/how-it-works',
  '/ai-search',
  '/try-mint-ai',
];

/** Exact-match public API routes. Sub-paths are NOT allowed. */
const PUBLIC_API_ROUTES_EXACT = new Set([
  '/api/csrf',
  '/api/stats/platform',
  '/api/diag',
  '/api/building-surveyor/demo',
  '/api/building-surveyor/demo-feedback',
  '/api/csp-report', // browser-generated CSP violation reports
  '/api/theme', // Phase-1 design rebrand toggle — sets a styling-only cookie
]);

/** Prefix-matched public API routes. Sub-paths ARE allowed. */
const PUBLIC_API_ROUTES_PREFIXED = ['/api/auth/'];

/** Admin auth pages (pre-login), exact-match. */
const ADMIN_AUTH_ROUTES = [
  '/admin/login',
  '/admin/register',
  '/admin/forgot-password',
];

/**
 * UUID-only contractor profile paths — prevents auth-bypass via paths like
 * `/contractor/settings` or `/contractor/dashboard-enhanced`.
 */
const UUID_CONTRACTOR_PROFILE_RE =
  /^\/contractor\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true when the given pathname requires no authentication.
 */
export function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;

  // Well-known association files (Apple Universal Links + Android App Links)
  // MUST be fetchable with no auth — Apple/Google crawlers send no cookies.
  // The middleware matcher runs on these paths, so without this whitelist they
  // would be redirected to /login and universal-link verification would fail.
  if (pathname.startsWith('/.well-known/')) return true;

  if (
    PUBLIC_PAGE_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    )
  ) {
    return true;
  }

  if (PUBLIC_API_ROUTES_EXACT.has(pathname)) return true;

  if (
    PUBLIC_API_ROUTES_PREFIXED.some((prefix) => pathname.startsWith(prefix))
  ) {
    return true;
  }

  if (UUID_CONTRACTOR_PROFILE_RE.test(pathname)) return true;

  if (ADMIN_AUTH_ROUTES.includes(pathname)) return true;

  return false;
}
