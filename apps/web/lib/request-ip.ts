/**
 * Trusted client-IP extraction.
 *
 * SECURITY: the first entry of `x-forwarded-for` is CLIENT-CONTROLLED.
 * Behind Vercel (or any reverse proxy chain), a remote caller can inject
 * `X-Forwarded-For: 1.2.3.4, <real-ip>` and spoof whichever value the
 * server reads. Per-IP rate limiters that split-0 XFF are therefore
 * trivially bypassable — which is what the 2026-04-21 security audit
 * flagged across `with-api-handler.ts`, `rate-limiter.ts`,
 * `rate-limiter/helpers.ts`, and `middleware/helpers.ts`.
 *
 * Trust order (first non-empty wins):
 *  1. `x-vercel-forwarded-for` — set by Vercel's edge, not client-settable.
 *  2. `cf-connecting-ip`       — Cloudflare equivalent (if ever fronted by CF).
 *  3. `x-forwarded-for` — use the LAST entry (closest proxy-observed IP).
 *  4. `x-real-ip`       — legacy nginx-style header.
 *
 * Never the first XFF entry.
 */

interface HeaderReader {
  get(name: string): string | null;
}

interface RequestLike {
  headers: HeaderReader;
}

function firstNonEmpty(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function lastForwardedEntry(xff: string | null): string | null {
  if (!xff) return null;
  const parts = xff
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

/**
 * Extract the trusted client IP from a request-like object (anything with
 * a `headers.get(name)` accessor, including `NextRequest` and `Request`).
 *
 * Returns `'unknown'` when no header is present so callers can always use
 * the result as an identifier without null-checks.
 */
export function getClientIp(request: RequestLike): string {
  const vercel = firstNonEmpty(request.headers.get('x-vercel-forwarded-for'));
  if (vercel) {
    // Vercel may still include multiple entries; take the first (Vercel's
    // leftmost is the original client, and Vercel validates it).
    return vercel.split(',')[0].trim() || 'unknown';
  }

  const cf = firstNonEmpty(request.headers.get('cf-connecting-ip'));
  if (cf) return cf;

  const xffLast = lastForwardedEntry(request.headers.get('x-forwarded-for'));
  if (xffLast) return xffLast;

  const realIp = firstNonEmpty(request.headers.get('x-real-ip'));
  if (realIp) return realIp;

  return 'unknown';
}
