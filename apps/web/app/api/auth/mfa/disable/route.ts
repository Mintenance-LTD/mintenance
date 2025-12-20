import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromHeaders } from '@/lib/auth';
import { MFAService } from '@/lib/mfa/mfa-service';
import { DatabaseManager } from '@/lib/database';
import { rateLimiter } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema
const disableMFASchema = z.object({
  password: z.string().min(1, 'Password is required for verification'),
});

/**
 * POST /api/auth/mfa/disable
 * Disable MFA for current user
 * Requires password confirmation for security
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    try {
      await requireCSRF(request);
    } catch (csrfError) {
      logger.warn('CSRF validation failed for MFA disable', {
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

    // Rate limiting - 3 attempts per hour
    const rateLimitResult = await rateLimiter.checkRateLimit({
      windowMs: 3600000, // 1 hour
      maxRequests: 3,
      identifier: `mfa-disable:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('MFA disable rate limit exceeded', {
        service: 'mfa',
        userId: user.id,
      });

      return NextResponse.json(
        {
          error: 'Too many disable attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = disableMFASchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Verify password
    const authenticatedUser = await DatabaseManager.authenticateUser(
      user.email,
      password
    );

    if (!authenticatedUser) {
      logger.warn('Failed password verification for MFA disable', {
        service: 'mfa',
        userId: user.id,
      });

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Check if MFA is enabled
    const mfaStatus = await MFAService.getMFAStatus(user.id);
    if (!mfaStatus.enabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled' },
        { status: 400 }
      );
    }

    // Disable MFA
    await MFAService.disableMFA(user.id);

    logger.info('MFA disabled', {
      service: 'mfa',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'MFA has been disabled. Your account is now protected by password only.',
    });
  } catch (error) {
    logger.error('Failed to disable MFA', error, {
      service: 'mfa',
    });

    return NextResponse.json(
      { error: 'Failed to disable MFA' },
      { status: 500 }
    );
  }
}
