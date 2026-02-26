import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { checkPasswordResetRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { passwordResetSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RateLimitError } from '@/lib/errors/api-error';

/**
 * POST /api/auth/forgot-password
 * Send password reset email (public endpoint, custom rate limiter)
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: false },
  async (request) => {
    // Custom rate limiting - 3 requests per hour
    const rateLimitResult = await checkPasswordResetRateLimit(request);

    if (!rateLimitResult.allowed) {
      logger.warn('Password reset rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      throw new RateLimitError();
    }

    const validation = await validateRequest(request, passwordResetSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { email } = validation.data;
    const supabase = serverSupabase;

    // Check if user exists (for better error handling internally)
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    const userExists = !!user;

    // Send password reset email
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
        userExists,
        emailConfirmed: user?.email_confirmed_at ? true : false,
      });

      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Network error. Please check your connection and try again.' },
          { status: 503 }
        );
      }

      if (error.message.includes('email rate limit') || error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Too many email requests. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }

      // If email not confirmed, try to confirm then retry
      if (user && !user.email_confirmed_at) {
        logger.info('Attempting to confirm email before password reset', { email, userId: user.id, service: 'auth' });
        try {
          const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true,
          });
          if (!confirmError) {
            const { error: retryError } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: redirectUrl,
            });
            if (!retryError) {
              logger.info('Password reset email sent after confirming email', { email, service: 'auth' });
            }
          }
        } catch (confirmErr) {
          logger.error('Failed to confirm email for password reset', confirmErr, { email, service: 'auth' });
        }
      }

      if (!userExists) {
        logger.warn('Password reset requested for non-existent email', { email, service: 'auth' });
      }
    }

    logger.info('Password reset email requested', { service: 'auth', email, success: !error });

    // Always return success to prevent email enumeration attacks
    const response = NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link shortly.',
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
