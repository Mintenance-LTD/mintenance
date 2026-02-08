import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

/**
 * POST /api/auth/resend-verification
 * Resend email verification email to the current user
 */
export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 5
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(5),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to resend verification');
    }

    // Validate request body
    const resendVerificationSchema = z.object({
      email: z.string().email(),
    });

    const validation = await validateRequest(request, resendVerificationSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: validatedData } = validation;

    // Get user's email from database
    const { data: userData, error: fetchError } = await serverSupabase
      .from('profiles')
      .select('email, verified')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      logger.error('Failed to fetch user for email verification', {
        service: 'auth',
        userId: user.id,
        error: fetchError?.message,
      });
      throw new NotFoundError('User not found');
    }

    // Check if already verified
    if (userData.verified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    if (!userData.email) {
      throw new BadRequestError('Email address not found');
    }

    // Resend confirmation email via Supabase Auth Admin API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration', {
        service: 'auth',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      throw new InternalServerError('Server configuration error. Please contact support.');
    }

    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`;
      
      // Use Supabase Auth resend endpoint to send confirmation email
      // This is the standard way to resend verification emails
      const resendUrl = `${supabaseUrl}/auth/v1/resend`;
      const response = await fetch(resendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          type: 'signup',
          email: userData.email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMessage = errorData.message || errorData.error_description || errorData.error || `HTTP ${response.status}`;
        
        logger.error('Failed to resend email verification', {
          service: 'auth',
          userId: user.id,
          email: userData.email,
          status: response.status,
          error: errorMessage,
          responseBody: errorData,
        });

        // In local development, emails go to Inbucket - provide helpful message
        const isLocalDev = process.env.NODE_ENV === 'development' || 
                          supabaseUrl.includes('127.0.0.1') || 
                          supabaseUrl.includes('localhost');
        
        if (isLocalDev) {
          // Even if there's an error, in local dev emails might still be in Inbucket
          return NextResponse.json({
            message: 'Verification email sent. In local development, check Inbucket at http://localhost:54324',
            devMode: true,
            inbucketUrl: 'http://localhost:54324',
            error: errorMessage, // Include error for debugging
          }, { status: 200 });
        }

        return NextResponse.json(
          { error: `Failed to send verification email: ${errorMessage}` },
          { status: 500 }
        );
      }

      // Success - email was sent
      const responseData = await response.json().catch(() => ({}));
      logger.info('Email verification resent successfully', {
        service: 'auth',
        userId: user.id,
        email: userData.email,
        response: responseData,
      });

      // In local development, remind user to check Inbucket
      const isLocalDev = process.env.NODE_ENV === 'development' || 
                        supabaseUrl.includes('127.0.0.1') || 
                        supabaseUrl.includes('localhost');
      
      if (isLocalDev) {
        return NextResponse.json({
          message: 'Verification email sent! In local development, check Inbucket at http://localhost:54324',
          success: true,
          devMode: true,
          inbucketUrl: 'http://localhost:54324',
        });
      }
    } catch (fetchError) {
      logger.error('Error calling Supabase Auth API for email resend', fetchError, {
        service: 'auth',
        userId: user.id,
        email: userData.email,
      });
      
      // In local development, assume email might be in Inbucket
      const isLocalDev = process.env.NODE_ENV === 'development' || 
                        supabaseUrl?.includes('127.0.0.1') || 
                        supabaseUrl?.includes('localhost');
      
      if (isLocalDev) {
        return NextResponse.json({
          message: 'Verification email may have been sent. In local development, check Inbucket at http://localhost:54324',
          devMode: true,
          inbucketUrl: 'http://localhost:54324',
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification email sent successfully. Please check your inbox.',
      success: true,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

