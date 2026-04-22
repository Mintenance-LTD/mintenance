/**
 * Open-redirect defense.
 *
 * Any client-side `router.push(searchParams.get('redirect') ?? ...)` call
 * is an open-redirect sink unless the destination is explicitly allowlisted.
 * Without this guard, an attacker can phish a user onto
 * `/login?redirect=https://evil.example/phish` (or, more insidiously,
 * `//evil.example` or `javascript:...`) and the app will happily
 * forward them after login.
 *
 * Trust rules (all must pass):
 *   1. URL parses (relative to current window origin).
 *   2. Resolved origin === current window.location.origin (same-origin).
 *   3. Raw input does NOT start with `//` or `/\` (protocol-relative
 *      tricks that coerce to a different origin in some browsers).
 *   4. Pathname begins with one of the explicit allowlisted prefixes.
 *
 * This is a CLIENT-SIDE helper — it reads `window.location.origin`, so
 * it must only be called from `'use client'` components.
 */

const ALLOWED_PATH_PREFIXES = [
  '/dashboard',
  '/contractor',
  '/jobs',
  '/profile',
  '/settings',
  '/checkout',
  '/favorites',
  '/notifications',
  '/messages',
  '/video-calls',
  '/admin',
] as const;

export function isAllowedRedirect(url: string | null | undefined): boolean {
  if (!url) return false;

  // Block protocol-relative + backslash variants before URL parsing,
  // because `new URL('//evil.com', 'https://mintenance.co.uk')` resolves
  // to `https://evil.com` — i.e. cross-origin.
  if (url.startsWith('//') || url.startsWith('/\\')) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return false;
    return ALLOWED_PATH_PREFIXES.some((p) => parsed.pathname.startsWith(p));
  } catch {
    return false;
  }
}

/**
 * Convenience: return `url` if it passes `isAllowedRedirect`, else `fallback`.
 */
export function safeRedirect(
  url: string | null | undefined,
  fallback: string
): string {
  return isAllowedRedirect(url) ? (url as string) : fallback;
}
