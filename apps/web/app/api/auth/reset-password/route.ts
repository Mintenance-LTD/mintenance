import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAnonClient } from '@/lib/api/supabaseServer';
import { checkPasswordResetRateLimit } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  BadRequestError,
  RateLimitError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { PasswordValidator, checkPasswordBreach } from '@mintenance/auth';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// replaces the manual `typeof accessToken === 'string'` + JWT-pattern
// regex + dual `password` / `newPassword` accepted-key compatibility.
// The schema preserves the legacy frontend behaviour (either field
// works) via a `.transform` that normalises to `password`.
const resetPasswordSchema = z
  .object({
    accessToken: z
      .string()
      .min(50, 'Invalid reset link. Please request a new password reset.')
      .max(4096)
      .regex(
        /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
        'Invalid reset link. Please request a new password reset.'
      ),
    password: z.string().min(1).max(128).optional(),
    newPassword: z.string().min(1).max(128).optional(),
  })
  .strict()
  .transform((d) => ({
    accessToken: d.accessToken,
    password: d.password ?? d.newPassword ?? '',
  }))
  .refine((d) => d.password.length > 0, {
    path: ['password'],
    message: 'Password is required',
  });

/**
 * POST /api/auth/reset-password
 * Reset user password using access token from email link.
 * Creates its own Supabase client for token-based session.
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: false },
  async (request) => {
    // Check Supabase configuration early
    if (!isSupabaseConfigured) {
      logger.error('Missing Supabase configuration', undefined, {
        service: 'auth',
      });
      throw new InternalServerError(
        'Service configuration error. Please contact support.'
      );
    }

    // Custom rate limiting to prevent abuse
    const rateLimitResult = await checkPasswordResetRateLimit(request);

    if (!rateLimitResult.allowed) {
      logger.warn('Password reset rate limit exceeded', {
        service: 'auth',
        ip: getClientIp(request),
      });
      throw new RateLimitError();
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = resetPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      logger.warn('Password reset failed input validation', {
        service: 'auth',
        ip: getClientIp(request),
        field: first?.path.join('.') ?? 'unknown',
      });
      throw new BadRequestError(first?.message ?? 'Invalid request');
    }
    const { accessToken, password: newPassword } = parsed.data;

    // SECURITY: Use centralized PasswordValidator (same validation as registration)
    const validationResult = PasswordValidator.validate(newPassword, {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxLength: 128,
    });

    if (!validationResult.isValid) {
      logger.warn('[SECURITY] Password reset blocked - validation failed', {
        service: 'auth',
        errors: validationResult.errors,
        ip: getClientIp(request),
      });
      throw new BadRequestError(validationResult.errors.join(', '));
    }

    // SECURITY: Check if password has been exposed in data breaches
    const breachResult = await checkPasswordBreach(newPassword);
    if (breachResult.isBreached) {
      logger.warn(
        '[SECURITY] Password reset blocked - breached password detected',
        {
          service: 'auth',
          occurrences: breachResult.occurrences,
          ip: getClientIp(request),
        }
      );
      throw new BadRequestError(
        `This password has been exposed in ${breachResult.occurrences?.toLocaleString()} data breaches. ` +
          `Please choose a different, more secure password.`
      );
    }

    // Initialize anon-key Supabase client for token-based session
    // NOTE: Uses anon client (not serverSupabase) because we need auth.setSession()
    const supabase = createAnonClient();

    // Set the session using the access token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // Not needed for password reset
    });

    if (sessionError) {
      logger.warn('Invalid or expired password reset token', {
        service: 'auth',
        error: sessionError.message,
      });
      throw new BadRequestError(
        'Invalid or expired reset link. Please request a new one.'
      );
    }

    // Update the password
    const { data: userData, error: updateError } =
      await supabase.auth.updateUser({
        password: newPassword,
      });

    if (updateError) {
      logger.error('Password update error', updateError, { service: 'auth' });
      throw new BadRequestError(
        updateError.message || 'Failed to reset password'
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    logger.info('Password reset successful', {
      service: 'auth',
      userId: userData?.user?.id,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          'Password reset successful. Please log in with your new password.',
      },
      { status: 200 }
    );
  }
);
