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
    const normalizedEmail = email.toLowerCase();

    // 2026-05-27 whole-app review Critical #5: closes the email-
    // enumeration oracle that lived here.
    //
    // Previous behaviour:
    //   1. `supabase.auth.admin.listUsers()` — an UNPAGINATED scan of
    //      the entire user table on EVERY forgot-password POST. Cost +
    //      privacy hit.
    //   2. Branched on `userExists` for the "confirm email + retry" path
    //      below, which fired 2 extra Supabase RPCs ONLY when the user
    //      existed and was unconfirmed. The synchronous response time
    //      delta is a usable enumeration signal despite the "always
    //      return 200" wrapper.
    //
    // Fix:
    //   1. Targeted `profiles` lookup (indexed, single-row read).
    //   2. The confirm-and-retry path is moved to a fire-and-forget
    //      async after we've already prepared the response, so the
    //      synchronous code path is identical whether or not the user
    //      exists. Response timing no longer leaks existence.
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // Send password reset email. resetPasswordForEmail does not error
    // when the address has no Supabase auth user (it silently no-ops),
    // so the same call runs regardless of `profileRow` presence.
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
        userExists: !!profileRow,
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

      // 2026-05-27 audit fix: the confirm-and-retry path for unconfirmed
      // accounts now runs ASYNC (no await) so it doesn't contribute to
      // the response-timing oracle. We still look up auth.users to know
      // if a retry is warranted, but only after the response shape is
      // decided. Logged on completion so operators can confirm recovery.
      if (profileRow) {
        void (async () => {
          try {
            const { data: authUserRes } = await supabase.auth.admin.getUserById(
              profileRow.id
            );
            const authUser = authUserRes?.user;
            if (authUser && !authUser.email_confirmed_at) {
              const { error: confirmError } =
                await supabase.auth.admin.updateUserById(authUser.id, {
                  email_confirm: true,
                });
              if (!confirmError) {
                await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: redirectUrl,
                });
                logger.info(
                  'Password reset email sent after async email confirm',
                  { email, service: 'auth' }
                );
              }
            }
          } catch (confirmErr) {
            logger.error('Async email-confirm retry failed', confirmErr, {
              email,
              service: 'auth',
            });
          }
        })();
      } else {
        logger.warn('Password reset requested for non-existent email', {
          email,
          service: 'auth',
        });
      }
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
