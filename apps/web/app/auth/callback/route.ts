import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient, serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/** Verification does not create an application session or bypass login/MFA. */
export async function GET(request: NextRequest) {
  // Explicitly empty fragment prevents browsers carrying an implicit Auth token
  // fragment forward from the callback URL onto the login page.
  const loginUrl = new URL('/login#', request.url);
  function fail(code: string, message: string) {
    loginUrl.searchParams.set('error', code);
    loginUrl.searchParams.set('message', message);
    return NextResponse.redirect(loginUrl);
  }
  const params = request.nextUrl.searchParams;
  if (params.has('error')) {
    // Provider error descriptions and callback URLs may contain sensitive data.
    return fail(
      'verification_failed',
      'The verification link failed or expired. Please request a new one.'
    );
  }
  const token = params.get('token_hash') || params.get('token');
  const type = params.get('type');
  if (!token && !type) {
    // Default confirmation links are consumed by Auth before redirecting here.
    // Browser-only session fragments are not proof available to this handler.
    // Require login, which checks Auth again, without claiming verification.
    return NextResponse.redirect(loginUrl);
  }
  if (
    !token ||
    token.length > 2048 ||
    (type !== 'signup' && type !== 'email')
  ) {
    return fail(
      'invalid_callback',
      'Invalid verification link. Please request a new one.'
    );
  }
  try {
    // Avoid mutating the shared service client's auth session.
    const { data, error } = await createAnonClient().auth.verifyOtp({
      token_hash: token,
      type,
    });
    if (error || !data.user?.email_confirmed_at) {
      return fail(
        'verification_failed',
        'Invalid or expired verification link. Please request a new one.'
      );
    }
    const { error: syncError } = await serverSupabase
      .from('profiles')
      .update({ verified: true })
      .eq('id', data.user.id);
    if (syncError) {
      logger.error(
        'Email verification profile synchronization failed',
        undefined,
        { service: 'auth', userId: data.user.id }
      );
      return fail(
        'verification_sync_failed',
        'Your email was confirmed, but account details could not be updated. Please sign in or contact support.'
      );
    }
    loginUrl.searchParams.set('verified', 'true');
    loginUrl.searchParams.set(
      'message',
      'Email verified successfully! You can now sign in.'
    );
    return NextResponse.redirect(loginUrl);
  } catch {
    logger.error('Email verification callback failed', undefined, {
      service: 'auth',
    });
    return fail(
      'server_error',
      'Verification could not be confirmed. Please try signing in or request a new link.'
    );
  }
}
