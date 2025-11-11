import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest } from '@/lib/validation/validator';
import { passwordUpdateSchema } from '@/lib/validation/schemas';
import { checkPasswordResetRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { isSupabaseConfigured } from '@/lib/supabase';
import { env } from '@/lib/env';
import { requireCSRF } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Check Supabase configuration early
    if (!isSupabaseConfigured) {
      logger.error('Missing Supabase configuration', undefined, { service: 'auth' });
      return NextResponse.json(
        { 
          error: 'Service configuration error. Please contact support.',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      );
    }

    // Rate limiting to prevent abuse
    const rateLimitResult = await checkPasswordResetRateLimit(request);

    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(rateLimitResult);
      logger.warn('Password reset rate limit exceeded', {
        service: 'auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        {
          error: 'Too many password reset attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers
        }
      );
    }

    const body = await request.json();
    const { accessToken, password } = body;

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

    // Validate password - accept either password or newPassword from frontend
    const newPassword = password || body.newPassword;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Use centralized password validation (matches registration validation)
    // This allows all common special characters including #, !, @, $, %, ^, &, *, etc.
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword); // Any non-alphanumeric character

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      const missing = [];
      if (!hasUppercase) missing.push('uppercase letter');
      if (!hasLowercase) missing.push('lowercase letter');
      if (!hasNumber) missing.push('number');
      if (!hasSpecialChar) missing.push('special character');
      
      return NextResponse.json(
        { error: `Password must contain at least one ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Initialize Supabase client using validated environment variables
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      logger.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined, { service: 'auth' });
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
