import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromHeaders } from '@/lib/auth';
import { MFAService } from '@/lib/mfa/mfa-service';
import { DatabaseManager } from '@/lib/database';
import { rateLimiter } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError, RateLimitError } from '@/lib/errors/api-error';

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
      throw new UnauthorizedError('Authentication required');
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

      throw new RateLimitError('Too many disable attempts. Please try again later.');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = disableMFASchema.safeParse(body);

    if (!validation.success) {
      throw new BadRequestError('Invalid request');
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

      throw new UnauthorizedError('Invalid password');
    }

    // Check if MFA is enabled
    const mfaStatus = await MFAService.getMFAStatus(user.id);
    if (!mfaStatus.enabled) {
      throw new BadRequestError('MFA is not enabled');
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
    return handleAPIError(error);
  }
}
