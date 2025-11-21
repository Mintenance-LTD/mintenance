import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { checkLoginRateLimit, recordSuccessfulLogin, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { loginSchema } from '@/lib/validation/schemas';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

// Route segment config to ensure proper error handling
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Export route handler with comprehensive error handling
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    try {
      await requireCSRF(request);
    } catch (csrfError) {
      logger.warn('CSRF validation failed', {
        service: 'auth',
        error: csrfError instanceof Error ? csrfError.message : 'Unknown CSRF error',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
    
    // Rate limiting check
    let rateLimitResult;
    try {
      rateLimitResult = await checkLoginRateLimit(request);
    } catch (rateLimitError) {
      logger.error('Rate limit check failed', rateLimitError, { service: 'auth' });
      // Continue without rate limiting if it fails (fail open for availability)
      rateLimitResult = { 
        allowed: true, 
        remaining: 100, 
        resetTime: Date.now() + 3600000,
        retryAfter: 0 
      };
    }

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
    let validation;
    try {
      validation = await validateRequest(request, loginSchema);
    } catch (validationError) {
      logger.error('Request validation error', validationError, { service: 'auth' });
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Authentication service error. Please try again.' },
        { status: 500 }
      );
    }

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
    // Log error details for debugging (server-side only)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : String(error);
    
    // Use console.error as fallback if logger fails
    try {
      if (logger && typeof logger.error === 'function') {
        logger.error('Login error', error, { service: 'auth' });
      } else {
        console.error('Login error (logger unavailable):', errorMessage, errorStack);
      }
    } catch (loggerError) {
      console.error('Login error (logger failed):', errorMessage, errorStack);
      console.error('Logger error:', loggerError);
    }

    // Handle CSRF validation errors specifically
    if (error instanceof Error && error.message === 'CSRF validation failed') {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
    
    // Log the actual error for debugging
    console.error('Login route error details:', {
      message: errorMessage,
      stack: errorStack?.substring(0, 500), // Limit stack trace length
      type: error?.constructor?.name || typeof error
    });

    // Always return JSON, never HTML - this is critical
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred. Please try again.',
        // Include error message in development for debugging
        ...(process.env.NODE_ENV === 'development' && { 
          details: errorMessage.substring(0, 200) // Limit length
        })
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
