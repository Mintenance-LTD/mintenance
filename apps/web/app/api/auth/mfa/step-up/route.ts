/**
 * POST /api/auth/mfa/step-up
 *
 * Sprint 7 (3.1): issues a short-lived MFA step-up cookie after a fresh
 * code verification. Used by routes that opt in via
 * `requireMfaVerifiedWithinMinutes` on withApiHandler.
 *
 * Flow:
 *   1. Client hits a protected admin mutation and receives
 *      403 { requiresStepUp: true, maxAgeMinutes }.
 *   2. Client collects a TOTP / backup / SMS / email code and POSTs here.
 *   3. We verify via MFAService.verifyMFA (same path used at login).
 *   4. On success we set an HMAC-signed __Host-mfa-stepup cookie with a
 *      maxAge of min(maxAgeMinutes, 60). Client retries the original request.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { MFAService } from '@/lib/mfa/mfa-service';
import { setStepUpCookie } from '@/lib/auth/mfa-step-up';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';

const stepUpSchema = z.object({
  code: z.string().min(6).max(16),
  method: z.enum(['totp', 'backup_code', 'sms', 'email']),
  maxAgeMinutes: z.number().int().positive().max(60).default(15),
});

export const POST = withApiHandler(
  { rateLimit: false, csrf: true },
  async (request, { user }) => {
    const body = await request.json().catch(() => ({}));
    const parsed = stepUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid step-up payload', details: parsed.error.errors },
        { status: 400 }
      );
    }
    const { code, method, maxAgeMinutes } = parsed.data;

    // Rate-limit step-up attempts per user so a stolen session cannot
    // brute-force a TOTP code: 5 attempts / 15 minutes.
    const rl = await rateLimiter.checkRateLimit({
      windowMs: 15 * 60_000,
      maxRequests: 5,
      identifier: `mfa-step-up:${user.id}`,
    });
    if (!rl.allowed) {
      logger.warn('MFA step-up rate limit exceeded', {
        service: 'mfa-step-up',
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: 'Too many step-up attempts. Please try again later.',
          retryAfter: rl.retryAfter,
        },
        { status: 429 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await MFAService.verifyMFA(
      user.id,
      code,
      method,
      ip,
      userAgent
    );

    if (!result.success) {
      logger.warn('MFA step-up verification failed', {
        service: 'mfa-step-up',
        userId: user.id,
        method,
      });
      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 401 }
      );
    }

    await setStepUpCookie(user.id, maxAgeMinutes * 60);

    logger.info('MFA step-up granted', {
      service: 'mfa-step-up',
      userId: user.id,
      method,
      maxAgeMinutes,
    });

    return NextResponse.json({ success: true, maxAgeMinutes });
  }
);
