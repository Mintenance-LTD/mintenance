import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkPasswordResetRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { passwordResetSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
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

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration', { service: 'auth' });
      return NextResponse.json(
        { error: 'Service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Use service role key for admin operations (can send emails regardless of user state)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists first (for better error handling)
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    const userExists = !!user;

    // Send password reset email
    // Use resetPasswordForEmail which sends the email automatically
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
        emailConfirmed: user?.email_confirmed_at ? true : false
      });

      // Provide user-friendly error messages for specific issues
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Network error. Please check your connection and try again.' },
          { status: 503 }
        );
      }

      // Check for Supabase configuration issues
      if (error.message.includes('email rate limit') || error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Too many email requests. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }

      // If email not confirmed, try to confirm it first (if user exists)
      if (user && !user.email_confirmed_at) {
        logger.info('Attempting to confirm email before password reset', { email, userId: user.id, service: 'auth' });
        try {
          // Confirm email using admin API
          const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true,
          });
          
          if (!confirmError) {
            // Retry password reset after confirming email
            const { error: retryError } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: redirectUrl,
            });
            
            if (!retryError) {
              logger.info('Password reset email sent after confirming email', { email, service: 'auth' });
              // Continue to success response below
            } else {
              logger.error('Password reset still failed after email confirmation', retryError, { email, service: 'auth' });
            }
          }
        } catch (confirmErr) {
          logger.error('Failed to confirm email for password reset', confirmErr, { email, service: 'auth' });
        }
      }

      // For other errors, log but don't reveal details (security best practice)
      // Return success to prevent email enumeration attacks
      // But log the error for debugging
      if (!userExists) {
        logger.warn('Password reset requested for non-existent email', { email, service: 'auth' });
      }
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
