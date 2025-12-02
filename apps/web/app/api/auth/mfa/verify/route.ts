import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MFAService } from '@/lib/mfa/mfa-service';
import { createTokenPair } from '@/lib/auth';
import { createAuthCookieHeaders } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';
import { DatabaseManager } from '@/lib/database';
import { logger } from '@mintenance/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema
const verifyMFASchema = z.object({
  preMfaToken: z.string().min(1, 'Pre-MFA token is required'),
  code: z.string().min(6, 'Code must be at least 6 characters'),
  method: z.enum(['totp', 'backup_code', 'sms', 'email']),
  rememberDevice: z.boolean().optional().default(false),
});

/**
 * POST /api/auth/mfa/verify
 * Verify MFA code during login
 * Creates full session after successful verification
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    try {
      await requireCSRF(request);
    } catch (csrfError) {
      logger.warn('CSRF validation failed for MFA verification', {
        service: 'mfa',
      });
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = verifyMFASchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { preMfaToken, code, method, rememberDevice } = validation.data;

    // Validate pre-MFA session
    const userId = await MFAService.validatePreMFASession(preMfaToken);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired session. Please login again.' },
        { status: 401 }
      );
    }

    // Rate limiting - 5 attempts per 15 minutes per user
    const rateLimitResult = await rateLimiter.checkRateLimit({
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
      identifier: `mfa-verify:${userId}`,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('MFA verification rate limit exceeded', {
        service: 'mfa',
        userId,
      });

      return NextResponse.json(
        {
          error: 'Too many verification attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Get IP and user agent for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Verify MFA code
    const verificationResult = await MFAService.verifyMFA(
      userId,
      code,
      method,
      ipAddress,
      userAgent
    );

    if (!verificationResult.success) {
      return NextResponse.json(
        { error: verificationResult.error || 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Delete pre-MFA session
    await MFAService.deletePreMFASession(preMfaToken);

    // Get full user data
    const user = await DatabaseManager.getUserById(userId);

    if (!user) {
      logger.error('User not found after MFA verification', {
        service: 'mfa',
        userId,
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create full session tokens
    const { accessToken, refreshToken } = await createTokenPair(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      { userAgent },
      ipAddress
    );

    // Create trusted device token if requested
    let trustedDeviceToken: string | undefined;
    if (rememberDevice) {
      const trustedDevice = await MFAService.createTrustedDevice(
        userId,
        'Web Browser',
        undefined,
        ipAddress,
        userAgent
      );
      trustedDeviceToken = trustedDevice.deviceToken;
    }

    logger.info('MFA verification successful', {
      service: 'mfa',
      userId,
      method,
      rememberDevice,
    });

    // Create response with auth cookies
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: user.email_verified,
      },
      requiresNewBackupCodes: verificationResult.requiresNewBackupCodes,
    });

    // Add auth cookies
    const cookieHeaders = createAuthCookieHeaders(accessToken, false, refreshToken);
    cookieHeaders.forEach((value, key) => {
      response.headers.append(key, value);
    });

    // Add trusted device cookie if created
    if (trustedDeviceToken) {
      const maxAge = 30 * 24 * 60 * 60; // 30 days
      const isProduction = process.env.NODE_ENV === 'production';
      response.headers.append(
        'Set-Cookie',
        `mintenance-trusted-device=${trustedDeviceToken}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict${isProduction ? '; Secure' : ''}`
      );
    }

    return response;
  } catch (error) {
    logger.error('MFA verification failed', error, {
      service: 'mfa',
    });

    return NextResponse.json(
      { error: 'Failed to verify MFA code' },
      { status: 500 }
    );
  }
}
