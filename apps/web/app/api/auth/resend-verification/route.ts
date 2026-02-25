import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification email to the current user
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 5 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, resendVerificationSchema);
    if (validation instanceof NextResponse) return validation;

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

    if (userData.verified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    if (!userData.email) {
      throw new BadRequestError('Email address not found');
    }

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

    const isLocalDev = process.env.NODE_ENV === 'development' ||
      supabaseUrl.includes('127.0.0.1') ||
      supabaseUrl.includes('localhost');

    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`;
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
          options: { emailRedirectTo: redirectUrl },
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
        });

        if (isLocalDev) {
          return NextResponse.json({
            message: 'Verification email sent. In local development, check Inbucket at http://localhost:54324',
            devMode: true,
            inbucketUrl: 'http://localhost:54324',
            error: errorMessage,
          }, { status: 200 });
        }

        return NextResponse.json(
          { error: `Failed to send verification email: ${errorMessage}` },
          { status: 500 }
        );
      }

      logger.info('Email verification resent successfully', {
        service: 'auth',
        userId: user.id,
        email: userData.email,
      });

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
  }
);
