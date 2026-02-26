import { NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { checkLoginRateLimit } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { registerSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { BadRequestError, RateLimitError } from '@/lib/errors/api-error';
import { checkPasswordBreach } from '@mintenance/auth';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/auth/register
 * Register a new user account with password breach checking.
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: false },
  async (request) => {
    // Custom rate limiting (use same limiter as login for consistency)
    const rateLimitResult = await checkLoginRateLimit(request);

    if (!rateLimitResult.allowed) {
      logger.warn('Registration rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      throw new RateLimitError();
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, registerSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { email, password, firstName, lastName, role, phone } = validation.data;

    // SECURITY: Check if password has been exposed in data breaches
    const breachResult = await checkPasswordBreach(password);
    if (breachResult.isBreached) {
      logger.warn('[SECURITY] Registration blocked - breached password detected', {
        service: 'auth',
        email,
        occurrences: breachResult.occurrences,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      throw new BadRequestError(
        `This password has been exposed in ${breachResult.occurrences?.toLocaleString()} data breaches. ` +
        `Please choose a different, more secure password.`
      );
    }

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

    // Initialize trial for contractors (non-blocking)
    if (role === 'contractor') {
      try {
        const { TrialService } = await import('@/lib/services/subscription/TrialService');
        await TrialService.initializeTrial(result.user.id);
        logger.info('Trial initialized for new contractor', {
          service: 'auth',
          userId: result.user.id,
        });
      } catch (trialError) {
        logger.error('Failed to initialize trial for new contractor', {
          service: 'auth',
          userId: result.user.id,
          error: trialError instanceof Error ? trialError.message : String(trialError),
        });
      }
    }

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
          emailVerified: result.user.verified
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
  }
);
