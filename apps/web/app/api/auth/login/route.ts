import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { checkLoginRateLimit, recordSuccessfulLogin, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { loginSchema } from '@/lib/validation/schemas';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { MFAService } from '@/lib/mfa/mfa-service';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError, RateLimitError, InternalServerError } from '@/lib/errors/api-error';

// Route segment config to ensure proper error handling
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Export route handler with comprehensive error handling
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection (throws ForbiddenError automatically)
    await requireCSRF(request);
    
    // Rate limiting check
    let rateLimitResult;
    try {
      rateLimitResult = await checkLoginRateLimit(request);
    } catch (rateLimitError) {
      logger.error('Rate limit check failed', rateLimitError, {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      // Fail closed: deny request when rate limiting is unavailable (security-first)
      throw new InternalServerError('Rate limiting service unavailable. Please try again later.');
    }

    if (!rateLimitResult.allowed) {
      logger.warn('Login rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      throw new RateLimitError();
    }

    // Validate and sanitize input using Zod schema
    let validation;
    try {
      validation = await validateRequest(request, loginSchema);
    } catch (validationError) {
      logger.error('Request validation error', validationError, { service: 'auth' });
      throw new BadRequestError('Invalid request format');
    }

    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { email, password, rememberMe } = validation.data;

    // Delegate authentication and cookie handling to AuthManager
    let result;
    try {
      result = await authManager.login({ email, password }, rememberMe || false);
    } catch (authError) {
      logger.error('AuthManager login error', authError, { service: 'auth', email });
      throw new InternalServerError('Authentication service error. Please try again.');
    }

    if (!result.success || !result.user) {
      logger.warn('Login failed', {
        service: 'auth',
        email,
        reason: result.error
      });
      throw new UnauthorizedError(result.error || 'Invalid email or password');
    }

    // Check if user has MFA enabled
    const { data: userData } = await serverSupabase
      .from('profiles')
      .select('mfa_enabled')
      .eq('id', result.user.id)
      .single();

    const mfaEnabled = userData?.mfa_enabled || false;

    // Check for trusted device cookie
    const cookieHeader = request.headers.get('cookie');
    const trustedDeviceMatch = cookieHeader?.match(/mintenance-trusted-device=([^;]+)/);
    const trustedDeviceToken = trustedDeviceMatch?.[1];

    let isTrustedDevice = false;
    if (trustedDeviceToken && mfaEnabled) {
      const validatedUserId = await MFAService.validateTrustedDevice(trustedDeviceToken);
      isTrustedDevice = validatedUserId === result.user.id;

      if (isTrustedDevice) {
        logger.info('Login from trusted device, skipping MFA', {
          service: 'auth',
          userId: result.user.id,
        });
      }
    }

    // If MFA is enabled and not a trusted device, create pre-MFA session
    if (mfaEnabled && !isTrustedDevice) {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                        request.headers.get('x-real-ip') ||
                        undefined;
      const userAgent = request.headers.get('user-agent') || undefined;

      const preMfaSession = await MFAService.createPreMFASession(
        result.user.id,
        ipAddress,
        userAgent
      );

      logger.info('MFA required for login', {
        service: 'auth',
        userId: result.user.id,
        email: result.user.email,
      });

      return NextResponse.json(
        {
          requiresMfa: true,
          preMfaToken: preMfaSession.sessionToken,
          message: 'MFA verification required',
        },
        { status: 200 }
      );
    }

    // Record successful login (for rate limiting)
    try {
      recordSuccessfulLogin(request);
    } catch (recordError) {
      // Log but don't fail the login if rate limit recording fails
      logger.warn('Failed to record successful login', { error: recordError, service: 'auth' });
    }

    logger.info('User logged in successfully', {
      service: 'auth',
      userId: result.user.id,
      email: result.user.email
    });

    // Create response
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          emailVerified: result.user.email_verified
        }
      },
      { status: 200 }
    );

    // Add cookie headers from auth result
    if (result.cookieHeaders) {
      result.cookieHeaders.forEach((value: string, key: string) => {
        response.headers.append(key, value);
      });
    }

    // Add rate limit headers to successful response
    const headers = createRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, String(value));
    });

    return response;

  } catch (error) {
    return handleAPIError(error);
  }
}
