/**
 * Sprint 7 (3.1): short-lived MFA step-up cookie.
 *
 * The goal: even admins whose session is valid for 12h must re-verify MFA
 * before running sensitive operations (escrow hold/approve, settings
 * mutations, tax-1099 generation, etc.). This closes the window where a
 * long-lived admin session, once compromised, could execute arbitrary
 * privileged actions without any fresh proof of presence.
 *
 * Flow:
 *   1. Admin hits a route marked `requireMfaVerifiedWithinMinutes: 15`.
 *   2. If no valid step-up cookie, route returns 403 { requiresStepUp: true }.
 *   3. Client opens a step-up modal and POSTs to /api/auth/mfa/step-up
 *      with a fresh TOTP / backup / SMS / email code.
 *   4. The endpoint verifies via MFAService.verifyMFA() and sets a signed
 *      __Host-mfa-stepup cookie with a 15-minute maxAge.
 *   5. Client retries the original request; the cookie is present;
 *      requireMfaVerifiedWithinMinutes passes.
 *
 * The cookie is opaque + signed so clients cannot forge an expiry further
 * out than we chose. We store `{ userId, verifiedAt }` in an HMAC'd payload.
 */

import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { logger } from '@mintenance/shared';

const STEP_UP_COOKIE_DEV = 'mfa-stepup';
const STEP_UP_COOKIE_PROD = '__Host-mfa-stepup';
const MAX_WINDOW_SECONDS = 60 * 60; // absolute cap: never trust a step-up
// proof older than 1h regardless of caller
// asking for a longer window.

function cookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? STEP_UP_COOKIE_PROD
    : STEP_UP_COOKIE_DEV;
}

function stepUpSecret(): string | null {
  const secret =
    process.env.MFA_STEP_UP_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    null;
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Build a step-up cookie value. Payload format: `${userId}.${verifiedAt}.${nonce}.${sig}`.
 */
export function buildStepUpCookieValue(userId: string): string {
  const secret = stepUpSecret();
  if (!secret) {
    throw new Error(
      'MFA_STEP_UP_SECRET / JWT_SECRET required to issue step-up cookies'
    );
  }
  const verifiedAt = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(8).toString('hex');
  const payload = `${userId}.${verifiedAt}.${nonce}`;
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

/**
 * Set the step-up cookie. Call this from /api/auth/mfa/step-up
 * after MFAService.verifyMFA succeeds.
 */
export async function setStepUpCookie(
  userId: string,
  maxAgeSeconds = 15 * 60
): Promise<void> {
  const jar = await cookies();
  const cappedMaxAge = Math.min(maxAgeSeconds, MAX_WINDOW_SECONDS);
  const isProd = process.env.NODE_ENV === 'production';
  jar.set(cookieName(), buildStepUpCookieValue(userId), {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: cappedMaxAge,
  });
}

export async function clearStepUpCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName());
}

/**
 * Verify that a step-up cookie is present, signed, belongs to `userId`,
 * and was issued within `maxAgeMinutes`. Returns true when it passes.
 */
export function hasValidStepUp(
  request: NextRequest,
  userId: string,
  maxAgeMinutes: number
): boolean {
  const secret = stepUpSecret();
  if (!secret) return false;

  const raw = request.cookies.get(cookieName())?.value;
  if (!raw) return false;

  const parts = raw.split('.');
  if (parts.length !== 4) return false;
  const [cookieUserId, verifiedAtStr, nonce, sig] = parts;

  if (cookieUserId !== userId) return false;

  const verifiedAt = Number(verifiedAtStr);
  if (!Number.isFinite(verifiedAt)) return false;

  const ageSec = Math.floor(Date.now() / 1000) - verifiedAt;
  const windowSec = Math.min(maxAgeMinutes * 60, MAX_WINDOW_SECONDS);
  if (ageSec < 0 || ageSec > windowSec) return false;

  const expectedSig = sign(`${cookieUserId}.${verifiedAtStr}.${nonce}`, secret);
  if (!safeEqual(sig, expectedSig)) {
    logger.warn('Step-up cookie signature mismatch', {
      service: 'mfa-step-up',
      userId,
    });
    return false;
  }

  return true;
}
