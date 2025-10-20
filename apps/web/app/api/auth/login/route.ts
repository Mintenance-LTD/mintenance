import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { checkLoginRateLimit, recordSuccessfulLogin, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { loginSchema } from '@/lib/validation/schemas';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);
    
    // Rate limiting check
    const rateLimitResult = await checkLoginRateLimit(request);

    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(rateLimitResult);
      logger.warn('Login rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers
        }
      );
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, loginSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { email, password, rememberMe } = validation.data;

    // Delegate authentication and cookie handling to AuthManager
    const result = await authManager.login({ email, password }, rememberMe || false);

    if (!result.success || !result.user) {
      logger.warn('Login failed', {
        service: 'auth',
        email,
        reason: result.error
      });
      
      return NextResponse.json(
        { error: result.error || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Record successful login (for rate limiting)
    recordSuccessfulLogin(request);

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

    // Add rate limit headers to successful response
    const headers = createRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    // Handle CSRF validation errors specifically
    if (error instanceof Error && error.message === 'CSRF validation failed') {
      logger.warn('CSRF validation failed', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
    
    logger.error('Login error', error, { service: 'auth' });

    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
