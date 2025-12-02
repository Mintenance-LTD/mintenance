import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromHeaders } from '@/lib/auth';
import { MFAService } from '@/lib/mfa/mfa-service';
import { rateLimiter } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema
const verifyEnrollmentSchema = z.object({
  token: z.string().length(6).regex(/^\d{6}$/, 'Token must be 6 digits'),
});

/**
 * POST /api/auth/mfa/verify-enrollment
 * Complete MFA enrollment by verifying TOTP token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    try {
      await requireCSRF(request);
    } catch (csrfError) {
      logger.warn('CSRF validation failed for MFA enrollment verification', {
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

    // Rate limiting - 5 attempts per 15 minutes
    const rateLimitResult = await rateLimiter.checkRateLimit({
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
      identifier: `mfa-verify-enrollment:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('MFA enrollment verification rate limit exceeded', {
        service: 'mfa',
        userId: user.id,
      });

      return NextResponse.json(
        {
          error: 'Too many verification attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = verifyEnrollmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Verify TOTP token
    const result = await MFAService.verifyTOTPEnrollment(user.id, token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 400 }
      );
    }

    logger.info('MFA enrollment completed', {
      service: 'mfa',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'MFA enabled successfully. Your account is now protected with two-factor authentication.',
    });
  } catch (error) {
    logger.error('MFA enrollment verification failed', error, {
      service: 'mfa',
    });

    return NextResponse.json(
      { error: 'Failed to verify enrollment' },
      { status: 500 }
    );
  }
}
