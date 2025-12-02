import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/auth';
import { MFAService } from '@/lib/mfa/mfa-service';
import { rateLimiter } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/mfa/enroll/totp
 * Start TOTP enrollment process
 * Returns QR code and backup codes
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    try {
      await requireCSRF(request);
    } catch (csrfError) {
      logger.warn('CSRF validation failed for MFA enrollment', {
        service: 'mfa',
      });
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Get current user
    const user = getCurrentUserFromHeaders(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting - 3 enrollment attempts per hour
    const rateLimitResult = await rateLimiter.checkRateLimit({
      windowMs: 3600000, // 1 hour
      maxRequests: 3,
      identifier: `mfa-enroll:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('MFA enrollment rate limit exceeded', {
        service: 'mfa',
        userId: user.id,
      });

      return NextResponse.json(
        {
          error: 'Too many enrollment attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Check if MFA is already enabled
    const mfaStatus = await MFAService.getMFAStatus(user.id);
    if (mfaStatus.enabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled. Disable it first to re-enroll.' },
        { status: 400 }
      );
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
  } catch (error) {
    logger.error('TOTP enrollment failed', error, {
      service: 'mfa',
    });

    return NextResponse.json(
      { error: 'Failed to start TOTP enrollment' },
      { status: 500 }
    );
  }
}
