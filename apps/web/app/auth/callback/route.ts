import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { redirect } from 'next/navigation';

/**
 * GET /auth/callback
 * Handles email verification callback from Supabase
 * This route is called when users click the verification link in their email
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle errors from Supabase
    if (error) {
      logger.error('Email verification callback error', {
        service: 'auth',
        error,
        errorDescription,
      });

      // Redirect to login with error message
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'verification_failed');
      loginUrl.searchParams.set('message', errorDescription || 'Email verification failed. Please try again.');
      return redirect(loginUrl.toString());
    }

    // Handle email verification
    // Supabase automatically verifies the email when the link is clicked
    // We just need to sync the verification status and redirect
    if (type === 'signup' && token) {
      try {
        // Exchange the token for a session to get user info
        const { data, error: exchangeError } = await serverSupabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });

        if (exchangeError) {
          logger.error('Failed to exchange verification token', {
            service: 'auth',
            error: exchangeError.message,
          });

          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('error', 'verification_failed');
          loginUrl.searchParams.set('message', 'Invalid or expired verification link. Please request a new one.');
          return redirect(loginUrl.toString());
        }

        if (data?.user) {
          // Supabase has already confirmed the email, sync our database
          await serverSupabase
            .from('users')
            .update({ email_verified: true })
            .eq('id', data.user.id);

          logger.info('Email verified successfully', {
            service: 'auth',
            userId: data.user.id,
            email: data.user.email,
          });

          // Redirect to login with success message
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('verified', 'true');
          loginUrl.searchParams.set('message', 'Email verified successfully! You can now sign in.');
          return redirect(loginUrl.toString());
        }
      } catch (verifyError) {
        logger.error('Error during email verification', verifyError, {
          service: 'auth',
        });

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'verification_failed');
        loginUrl.searchParams.set('message', 'An error occurred during verification. Please try again.');
        return redirect(loginUrl.toString());
      }
    }

    // If no token or type, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'invalid_callback');
    loginUrl.searchParams.set('message', 'Invalid verification link. Please request a new one.');
    return redirect(loginUrl.toString());

  } catch (error) {
    logger.error('Auth callback error', error, {
      service: 'auth',
      method: request.method,
      url: request.url,
    });

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'server_error');
    loginUrl.searchParams.set('message', 'An unexpected error occurred. Please try again.');
    return redirect(loginUrl.toString());
  }
}

