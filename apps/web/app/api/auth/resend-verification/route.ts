import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * POST /api/auth/resend-verification
 * Resend email verification email to the current user
 */
export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's email from database
    const { data: userData, error: fetchError } = await serverSupabase
      .from('users')
      .select('email, email_verified')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      logger.error('Failed to fetch user for email verification', {
        service: 'auth',
        userId: user.id,
        error: fetchError?.message,
      });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already verified
    if (userData.email_verified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    if (!userData.email) {
      return NextResponse.json(
        { error: 'Email address not found' },
        { status: 400 }
      );
    }

    // Resend confirmation email via Supabase Auth API
    // Use the resend endpoint directly via HTTP since auth.resend() may not be available on server client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration', {
        service: 'auth',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    try {
      // Call the Supabase Auth resend endpoint directly
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
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
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
        });

        // In development mode, if email service isn't configured, we can manually verify
        if (process.env.NODE_ENV === 'development' && 
            (errorMessage?.includes('email service') || 
             errorMessage?.includes('not configured') ||
             errorMessage?.includes('SMTP'))) {
          
          return NextResponse.json({
            error: 'Email service not configured. In development mode, you can verify your email manually.',
            devMode: true,
            message: 'To verify your email in development: Go to Supabase Dashboard → Auth → Users → Find your user → Click "Confirm Email"',
          }, { status: 400 });
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
    } catch (fetchError) {
      logger.error('Error calling Supabase Auth API for email resend', fetchError, {
        service: 'auth',
        userId: user.id,
        email: userData.email,
      });
      
      // Check if it's a known error we can handle
      if (fetchError instanceof Error) {
        const errorMessage = fetchError.message;
        
        // In development mode, if email service isn't configured, we can manually verify
        if (process.env.NODE_ENV === 'development' && 
            (errorMessage?.includes('email service') || 
             errorMessage?.includes('not configured') ||
             errorMessage?.includes('SMTP'))) {
          
          return NextResponse.json({
            error: 'Email service not configured. In development mode, you can verify your email manually.',
            devMode: true,
            message: 'To verify your email in development: Go to Supabase Dashboard → Auth → Users → Find your user → Click "Confirm Email"',
          }, { status: 400 });
        }
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
    logger.error('Error resending email verification', error, {
      service: 'auth',
      method: request.method,
      url: request.url,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

