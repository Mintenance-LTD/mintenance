/**
 * Safe-action-url validation for notification click handlers.
 *
 * 2026-04-30 audit P0 (Notification Click Actions Need Safe Routing):
 * `notification.action_url` and `notification.link` are user/server-
 * supplied strings that get pushed straight into `router.push()` /
 * `<Link href>`. Without validation a malicious or stale value could
 * redirect the user to:
 *   - an attacker-controlled external domain,
 *   - a `javascript:` URI,
 *   - an absolute path that bypasses our auth flow.
 *
 * `safeActionUrl(raw)` returns the URL only if it points at an
 * allow-listed internal path; otherwise it returns the supplied
 * fallback (default `/notifications`) so the user lands on the in-app
 * inbox rather than wherever the bad URL pointed.
 */

const ALLOWED_PREFIXES = [
  '/notifications',
  '/dashboard',
  '/jobs',
  '/messages',
  '/contractor',
  '/properties',
  '/payments',
  '/invoices',
  '/checkout',
  '/admin',
  '/profile',
  '/scheduling',
  '/timeline',
  '/financials',
  '/disputes',
  '/homeowner',
  '/landlord',
  '/contractors',
  '/contract',
  '/account',
  '/settings',
  '/building-assessments',
  '/help',
  '/faq',
  '/reviews',
];

/**
 * Returns true when `path` is an allow-listed internal route.
 * Exported for tests and for callers that need a yes/no signal
 * (e.g. server-side metrics).
 */
export function isAllowedActionPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed) return false;

  // Reject anything that isn't a clean leading-slash internal path.
  // This rules out `javascript:`, `mailto:`, `tel:`, `//evil.com`,
  // `https://evil.com`, fragment-only `#foo`, and empty strings.
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('//')) return false;

  // Strip query/fragment for the prefix match.
  const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed;

  return ALLOWED_PREFIXES.some(
    (prefix) => withoutQuery === prefix || withoutQuery.startsWith(`${prefix}/`)
  );
}

/**
 * Resolve a notification action URL to a safe destination.
 *
 * Use everywhere a notification's `action_url` / `link` field gets
 * pushed into the router or rendered as an `<a href>`.
 */
export function safeActionUrl(
  raw: string | null | undefined,
  fallback = '/notifications'
): string {
  return isAllowedActionPath(raw) ? (raw as string) : fallback;
}
