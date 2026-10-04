import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  checkPasswordResetRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { passwordResetSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RateLimitError } from '@/lib/errors/api-error';
import { getClientIp } from '@/lib/request-ip';

/**
 * POST /api/auth/forgot-password
 * Send password reset email (public endpoint, custom rate limiter)
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 3, windowMs: 3_600_000 } },
  async (request) => {
    // Custom rate limiting - 3 requests per hour
    const rateLimitResult = await checkPasswordResetRateLimit(request);

    if (!rateLimitResult.allowed) {
      logger.warn('Password reset rate limit exceeded', {
        service: 'auth',
        ip: getClientIp(request),
      });
      throw new RateLimitError();
    }

    const validation = await validateRequest(request, passwordResetSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { email } = validation.data;
    const supabase = serverSupabase;

    // Send password reset email. resetPasswordForEmail does not error
    // when the address has no Supabase auth user (it silently no-ops),
    // so the same call runs regardless of account existence.
    const redirectUrl = `${request.nextUrl.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      logger.error('Password reset email failed', {
        service: 'auth',
        email,
        errorMessage: error.message,
        redirectUrl,
        errorCode: error.status || 'unknown',
      });

      if (
        error.message.includes('Network request failed') ||
        error.message.includes('fetch')
      ) {
        return NextResponse.json(
          {
            error: 'Network error. Please check your connection and try again.',
          },
          { status: 503 }
        );
      }

      if (
        error.message.includes('email rate limit') ||
        error.message.includes('rate_limit_exceeded')
      ) {
        return NextResponse.json(
          {
            error:
              'Too many email requests. Please wait a few minutes and try again.',
          },
          { status: 429 }
        );
      }

      // A reset request is not proof of email ownership. Never confirm an
      // account or retry with administrative privileges on provider failure.
    }

    logger.info('Password reset email requested', {
      service: 'auth',
      email,
      success: !error,
    });

    // Always return success to prevent email enumeration attacks
    const response = NextResponse.json(
      {
        success: true,
        message:
          'If an account exists with this email, you will receive a password reset link shortly.',
      },
      { status: 200 }
    );

    const headers = createRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
);
