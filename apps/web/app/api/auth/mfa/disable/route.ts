import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MFAService } from '@/lib/mfa/mfa-service';
import { DatabaseManager } from '@/lib/database';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { UnauthorizedError, BadRequestError, RateLimitError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const disableMFASchema = z.object({
  password: z.string().min(1, 'Password is required for verification'),
});

/**
 * POST /api/auth/mfa/disable - disable MFA (requires password confirmation).
 */
export const POST = withApiHandler(
  { rateLimit: false }, // Uses per-user rate limiting below instead of per-IP
  async (request, { user }) => {
    // Per-user rate limiting: 3 attempts per hour
    const rateLimitResult = await rateLimiter.checkRateLimit({
      windowMs: 3600000,
      maxRequests: 3,
      identifier: `mfa-disable:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('MFA disable rate limit exceeded', { service: 'mfa', userId: user.id });
      throw new RateLimitError();
    }

    const body = await request.json();
    const validation = disableMFASchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request');
    }

    const { password } = validation.data;

    // Verify password
    const authenticatedUser = await DatabaseManager.authenticateUser(user.email, password);
    if (!authenticatedUser) {
      logger.warn('Failed password verification for MFA disable', { service: 'mfa', userId: user.id });
      throw new UnauthorizedError('Invalid password');
    }

    const mfaStatus = await MFAService.getMFAStatus(user.id);
    if (!mfaStatus.enabled) {
      throw new BadRequestError('MFA is not enabled');
    }

    await MFAService.disableMFA(user.id);

    logger.info('MFA disabled', { service: 'mfa', userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'MFA has been disabled. Your account is now protected by password only.',
    });
  },
);
