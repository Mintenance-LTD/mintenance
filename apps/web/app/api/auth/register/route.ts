import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { checkLoginRateLimit, recordSuccessfulLogin, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { registerSchema } from '@/lib/validation/schemas';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError, RateLimitError } from '@/lib/errors/api-error';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting check (use same limiter as login for consistency)
    const rateLimitResult = await checkLoginRateLimit(request);

    if (!rateLimitResult.allowed) {
      logger.warn('Registration rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      throw new RateLimitError('Too many registration attempts. Please try again later.');
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
      throw new BadRequestError('Admin accounts must use @mintenance.co.uk email address');
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
      throw new BadRequestError(result.error || 'Registration failed');
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
    return handleAPIError(error);
  }
}