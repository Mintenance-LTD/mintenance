import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { checkLoginRateLimit, recordSuccessfulLogin, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { registerSchema } from '@/lib/validation/schemas';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting check (use same limiter as login for consistency)
    const rateLimitResult = await checkLoginRateLimit(request);

    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(rateLimitResult);
      logger.warn('Registration rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers
        }
      );
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, registerSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { email, password, firstName, lastName, role, phone } = validation.data;

    // Validate admin email domain
    if (role === 'admin' && !email.endsWith('@mintenance.co.uk')) {
      logger.warn('Admin registration attempt with invalid email domain', {
        service: 'auth',
        email,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        { error: 'Admin accounts must use @mintenance.co.uk email address' },
        { status: 400 }
      );
    }

    // Register user with AuthManager
    const result = await authManager.register({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role,
      phone: phone as string | undefined, // Type assertion for Zod preprocess result
    });

    if (!result.success || !result.user) {
      logger.warn('Registration failed', {
        service: 'auth',
        email,
        reason: result.error
      });

      return NextResponse.json(
        { error: result.error || 'Registration failed' },
        { status: 400 }
      );
    }

    logger.info('User registered successfully', {
      service: 'auth',
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role
    });

    // Create response
    const response = NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          emailVerified: result.user.email_verified
        }
      },
      { status: 201 }
    );

    // Add cookie headers from auth result
    if (result.cookieHeaders) {
      result.cookieHeaders.forEach((value: string, key: string) => {
        response.headers.append(key, value);
      });
    }

    return response;

  } catch (error) {
  // Handle CSRF validation errors specifically
  if (error instanceof Error && error.message === 'CSRF validation failed') {
    logger.warn('CSRF validation failed', {
      service: 'auth',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      hasHeaderToken: !!request.headers.get('x-csrf-token'),
      cookies: request.headers.get('cookie')?.substring(0, 100) || 'none'
    });

    return NextResponse.json(
      { error: 'CSRF validation failed', message: 'Please refresh the page and try again.' },
      { status: 403 }
    );
  }

  logger.error('Registration error', error, { service: 'auth' });

  // Don't expose internal error details to client
  return NextResponse.json(
    { error: 'An unexpected error occurred. Please try again.' },
    { status: 500 }
  );
}
}