/**
 * Cron Authentication Helper
 *
 * Two accepted auth modes, tried in order:
 *
 * 1. HMAC-signed request (preferred, Sprint 7 / 2.4):
 *      X-Cron-Timestamp: <unix epoch seconds>
 *      X-Cron-Signature: hex(hmac-sha256(secret, `${timestamp}.${path}`))
 *    The timestamp must be within CRON_HMAC_TOLERANCE_SECONDS (default 300s)
 *    of server time. This gives us replay protection: a leaked cron call
 *    expires on its own, unlike a static bearer token.
 *
 * 2. Bearer secret (legacy):
 *      Authorization: Bearer <secret>
 *    Kept for compatibility with the existing vercel.json cron entries
 *    that Vercel's scheduler emits as simple bearer calls. Rotate via
 *    the CRON_SECRET env var.
 *
 * For either mode, the secret used is resolved via resolveCronSecret():
 *   - If `CRON_SECRET_<UPPER_JOB_NAME>` exists (e.g.
 *     CRON_SECRET_ESCROW_AUTO_RELEASE for /api/cron/escrow-auto-release),
 *     that per-job secret is used. Otherwise fall back to CRON_SECRET.
 *   This lets operators rotate a single high-risk cron's secret without
 *   touching the rest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_HMAC_TOLERANCE_SECONDS = 300;

function tolerance(): number {
  const raw = Number(process.env.CRON_HMAC_TOLERANCE_SECONDS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_HMAC_TOLERANCE_SECONDS;
}

/**
 * Resolve the secret for a cron path.
 * /api/cron/escrow-auto-release -> CRON_SECRET_ESCROW_AUTO_RELEASE || CRON_SECRET
 */
function resolveCronSecret(path: string): string | null {
  const slug = path.split('/').filter(Boolean).pop() ?? '';
  const perJobKey =
    'CRON_SECRET_' + slug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const perJobSecret = process.env[perJobKey]?.trim();
  if (perJobSecret) return perJobSecret;
  const shared = process.env.CRON_SECRET?.trim();
  return shared || null;
}

function verifyHmac(
  secret: string,
  path: string,
  timestampHeader: string | null,
  signatureHeader: string | null
): boolean {
  if (!timestampHeader || !signatureHeader) return false;

  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > tolerance()) {
    return false; // stale / future-dated — replay window closed
  }

  const expected = createHmac('sha256', secret)
    .update(`${ts}.${path}`)
    .digest('hex');

  const providedBuf = Buffer.from(signatureHeader, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (providedBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(providedBuf, expectedBuf);
}

function verifyBearer(secret: string, authHeader: string | null): boolean {
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Verify cron authentication. Prefers HMAC signature + timestamp (replay
 * protection) and falls back to the legacy bearer header.
 */
function verifyCronRequest(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  const secret = resolveCronSecret(path);

  if (!secret) {
    logger.error(
      'No cron secret configured (checked per-job + CRON_SECRET)',
      undefined,
      { service: 'cron-auth', path }
    );
    return false;
  }

  // Try HMAC first — the preferred path with replay protection.
  const tsHeader = request.headers.get('x-cron-timestamp');
  const sigHeader = request.headers.get('x-cron-signature');
  if (tsHeader || sigHeader) {
    return verifyHmac(secret, path, tsHeader, sigHeader);
  }

  // Fall back to legacy bearer header.
  return verifyBearer(secret, request.headers.get('authorization'));
}

/**
 * Middleware function to protect cron endpoints.
 * Returns 401 response if authentication fails.
 */
export function requireCronAuth(request: NextRequest): NextResponse | null {
  if (!verifyCronRequest(request)) {
    logger.warn('Unauthorized cron request', {
      service: 'cron-auth',
      path: request.nextUrl.pathname,
      hasAuthHeader: !!request.headers.get('authorization'),
      hasHmacSignature: !!request.headers.get('x-cron-signature'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
