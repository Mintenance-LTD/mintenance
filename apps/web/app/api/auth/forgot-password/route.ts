import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkPasswordResetRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { passwordResetSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 3 requests per hour
    const rateLimitResult = await checkPasswordResetRateLimit(request);

    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(rateLimitResult);
      logger.warn('Password reset rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers
        }
      );
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, passwordResetSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { email } = validation.data;

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase configuration', { service: 'auth' });
      return NextResponse.json(
        { error: 'Service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.nextUrl.origin}/reset-password`,
    });

    if (error) {
      logger.warn('Password reset email failed (hidden from user)', {
        service: 'auth',
        email,
        errorMessage: error.message
      });

      // Provide user-friendly error messages for network issues only
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Network error. Please check your connection and try again.' },
          { status: 503 }
        );
      }

      // Don't reveal if user exists or not (security best practice)
      // Just return success regardless
    }

    logger.info('Password reset email requested', {
      service: 'auth',
      email,
      success: !error
    });

    // Always return success to prevent email enumeration attacks
    const response = NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link shortly.'
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
    logger.error('Forgot password error', error, { service: 'auth' });

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
