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

    // Register user
    const result = await authManager.register({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role,
      phone
    });

    if (!result.success) {
      logger.warn('Registration failed', {
        service: 'auth',
        email,
        reason: result.error
      });
      
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Record successful registration (for rate limiting)
    recordSuccessfulLogin(request);

    logger.info('User registered successfully', {
      service: 'auth',
      userId: result.user!.id,
      email: result.user!.email,
      role: result.user!.role
    });

    // Create response immediately (don't wait for background tasks)
    const response = NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: result.user!.id,
          email: result.user!.email,
          role: result.user!.role,
          firstName: result.user!.first_name,
          lastName: result.user!.last_name,
          emailVerified: result.user!.email_verified
        }
      },
      { status: 201 }
    );

    // Add cookie headers from auth result
    if (result.cookieHeaders) {
      result.cookieHeaders.forEach((value, key) => {
        response.headers.append(key, value);
      });
    }

    // Add rate limit headers to successful response
    const headers = createRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Run background tasks (non-blocking) - don't await
    if (result.user!.role === 'contractor') {
      Promise.all([
        (async () => {
          try {
            const { TrialService } = await import('@/lib/services/subscription/TrialService');
            const { SubscriptionService } = await import('@/lib/services/subscription/SubscriptionService');
            const { TrialNotifications } = await import('@/lib/services/notifications/TrialNotifications');
            
            // Initialize free tier subscription
            try {
              await SubscriptionService.createFreeTierSubscription(result.user!.id);
              logger.info('Free tier subscription created for new contractor', {
                service: 'auth',
                userId: result.user!.id,
              });
            } catch (freeTierError) {
              logger.error('Failed to create free tier subscription', {
                service: 'auth',
                userId: result.user!.id,
                error: freeTierError instanceof Error ? freeTierError.message : String(freeTierError),
              });
            }
            
            // Initialize trial period (for paid plan upgrades)
            const trialInitialized = await TrialService.initializeTrial(result.user!.id);
            if (trialInitialized) {
              // Send welcome email (non-blocking)
              TrialNotifications.sendTrialWelcomeEmail(result.user!.id).catch((err) => {
                logger.error('Failed to send trial welcome email', {
                  service: 'auth',
                  userId: result.user!.id,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
            }
          } catch (trialError) {
            logger.error('Failed to initialize trial period', {
              service: 'auth',
              userId: result.user!.id,
              error: trialError instanceof Error ? trialError.message : String(trialError),
            });
          }
        })(),
      ]).catch((err) => {
        logger.error('Background registration task failed', {
          service: 'auth',
          userId: result.user!.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    // Send welcome email and phone verification for homeowners (background)
    if (result.user!.role === 'homeowner') {
      Promise.all([
        (async () => {
          try {
            const { HomeownerNotifications } = await import('@/lib/services/notifications/HomeownerNotifications');
            
            // Send welcome email (non-blocking)
            HomeownerNotifications.sendWelcomeEmail(result.user!.id).catch((err) => {
              logger.error('Failed to send homeowner welcome email', {
                service: 'auth',
                userId: result.user!.id,
                error: err instanceof Error ? err.message : String(err),
              });
            });

            // Send phone verification code if phone provided
            if (phone) {
              const { PhoneVerificationService } = await import('@/lib/services/verification/PhoneVerificationService');
              PhoneVerificationService.sendVerificationCode(result.user!.id, phone).catch((err) => {
                logger.error('Failed to send phone verification code', {
                  service: 'auth',
                  userId: result.user!.id,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
            }
          } catch (emailError) {
            logger.error('Failed to send homeowner welcome email', {
              service: 'auth',
              userId: result.user!.id,
              error: emailError instanceof Error ? emailError.message : String(emailError),
            });
          }
        })(),
      ]).catch((err) => {
        logger.error('Background homeowner registration task failed', {
          service: 'auth',
          userId: result.user!.id,
          error: err instanceof Error ? err.message : String(err),
        });
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