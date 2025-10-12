import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest } from '@/lib/validation/validator';
import { passwordUpdateSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    // Note: We could add rate limiting here too, but the access token
    // already provides security since it's one-time use and expires

    const body = await request.json();
    const { accessToken } = body;

    // Validate access token
    if (!accessToken) {
      logger.warn('Password reset attempted without access token', {
        service: 'auth'
      });
      return NextResponse.json(
        { error: 'Invalid reset link. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Validate password using schema (complexity requirements)
    const validation = await validateRequest(request, passwordUpdateSchema.omit({ token: true }));
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { newPassword } = validation.data;

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase configuration', undefined, { service: 'auth' });
      return NextResponse.json(
        { error: 'Service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Set the session using the access token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // Not needed for password reset
    });

    if (sessionError) {
      logger.warn('Invalid or expired password reset token', {
        service: 'auth',
        error: sessionError.message
      });
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update the password
    const { data: userData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      logger.error('Password update error', updateError, { service: 'auth' });
      return NextResponse.json(
        { error: updateError.message || 'Failed to reset password' },
        { status: 400 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    logger.info('Password reset successful', {
      service: 'auth',
      userId: userData?.user?.id
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset successful. Please log in with your new password.'
      },
      { status: 200 }
    );

  } catch (error: any) {
    logger.error('Reset password error', error, { service: 'auth' });

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
