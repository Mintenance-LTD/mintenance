import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { MFAService } from '@/lib/mfa/mfa-service';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { BadRequestError, RateLimitError } from '@/lib/errors/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/mfa/enroll/totp
 * Start TOTP enrollment process
 * Returns QR code and backup codes
 */
export const POST = withApiHandler({ rateLimit: false }, async (_request, { user }) => {
  // Custom rate limiting - 3 enrollment attempts per hour
  const rateLimitResult = await rateLimiter.checkRateLimit({
    windowMs: 3600000,
    maxRequests: 3,
    identifier: `mfa-enroll:${user.id}`,
  });

  if (!rateLimitResult.allowed) {
    logger.warn('MFA enrollment rate limit exceeded', {
      service: 'mfa',
      userId: user.id,
    });
    throw new RateLimitError(rateLimitResult.retryAfter ?? 3600);
  }

  // Check if MFA is already enabled
  const mfaStatus = await MFAService.getMFAStatus(user.id);
  if (mfaStatus.enabled) {
    throw new BadRequestError('MFA is already enabled. Disable it first to re-enroll.');
  }

  // Start TOTP enrollment
  const enrollmentData = await MFAService.enrollTOTP(user.id);

  logger.info('TOTP enrollment started', {
    service: 'mfa',
    userId: user.id,
  });

  return NextResponse.json({
    success: true,
    data: {
      secret: enrollmentData.secret,
      qrCode: enrollmentData.qrCodeDataUrl,
      backupCodes: enrollmentData.backupCodes,
    },
    message: 'Scan the QR code with your authenticator app and save the backup codes.',
  });
});
