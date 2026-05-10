import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MFAService } from '@/lib/mfa/mfa-service';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RateLimitError } from '@/lib/errors/api-error';
import { logAuditEvent, getClientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Audit P2 (2026-05-10): `.strict()` to reject unknown keys.
const verifyEnrollmentSchema = z
  .object({
    token: z
      .string()
      .length(6)
      .regex(/^\d{6}$/, 'Token must be 6 digits'),
  })
  .strict();

/**
 * POST /api/auth/mfa/verify-enrollment
 * Complete MFA enrollment by verifying TOTP token
 */
export const POST = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Custom rate limiting - 5 attempts per 15 minutes (user-based)
    const rateLimitResult = await rateLimiter.checkRateLimit({
      windowMs: 900000,
      maxRequests: 5,
      identifier: `mfa-verify-enrollment:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('MFA enrollment verification rate limit exceeded', {
        service: 'mfa',
        userId: user.id,
      });
      throw new RateLimitError(rateLimitResult.retryAfter ?? 900);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = verifyEnrollmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Verify TOTP token
    const result = await MFAService.verifyTOTPEnrollment(user.id, token);

    if (!result.success) {
      // Sprint 5.2: failed enrollment verifications are security-relevant
      await logAuditEvent({
        actorId: user.id,
        category: 'mfa',
        action: 'enroll_totp_verify_failed',
        targetId: user.id,
        ipAddress: getClientIp(request),
      });
      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 400 }
      );
    }

    logger.info('MFA enrollment completed', {
      service: 'mfa',
      userId: user.id,
    });

    // Sprint 5.2: audit trail for sensitive auth events
    await logAuditEvent({
      actorId: user.id,
      category: 'mfa',
      action: 'enroll_totp_completed',
      targetId: user.id,
      after: { mfa_enabled: true, method: 'totp' },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message:
        'MFA enabled successfully. Your account is now protected with two-factor authentication.',
    });
  }
);
