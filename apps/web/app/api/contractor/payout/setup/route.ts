import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * POST /api/contractor/payout/setup
 * Set up Stripe Connect account for contractor payouts
 */
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can set up payout accounts' }, { status: 403 });
    }

    // Invoke Supabase Edge Function to set up Stripe Connect
    // Explicitly pass authorization header to ensure authentication
    // The service role key should be used for server-side function invocations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    logger.info('Invoking Edge Function', {
      service: 'payments',
      userId: user.id,
      functionName: 'setup-contractor-payout',
    });

    // Invoke with explicit Authorization header (required for Edge Functions)
    const { data, error } = await serverSupabase.functions.invoke('setup-contractor-payout', {
      body: { contractorId: user.id },
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (error) {
      // Edge Functions return errors in the data field when status is non-2xx
      // The error object may contain statusCode, message, and the data may contain error details
      let errorMessage = error.message || 'Failed to set up payout account';
      let errorDetails: unknown = undefined;
      
      // Try to extract detailed error information from data
      if (data) {
        if (typeof data === 'object') {
          // Check for error field in response
          if ('error' in data) {
            errorMessage = (data as { error?: string }).error || errorMessage;
          }
          // Check for details field (from Edge Function error response)
          if ('details' in data) {
            errorDetails = (data as { details?: unknown }).details;
          }
          // If data itself is an error object
          if ('message' in data && typeof (data as { message?: unknown }).message === 'string') {
            errorMessage = (data as { message: string }).message;
          }
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      }
      
      // Log comprehensive error information for debugging
      logger.error('Edge Function error', {
        service: 'payments',
        userId: user.id,
        contractorId: user.id,
        errorMessage,
        errorDetails,
        errorStatus: (error as { statusCode?: number }).statusCode,
        errorCode: (error as { code?: string }).code,
        errorObject: error,
        responseData: data,
      });
      
      // Return a more descriptive error message
      throw new Error(errorMessage);
    }

    const payload = (data ?? {}) as Record<string, unknown>;
    const accountUrl = (payload['accountUrl'] ?? payload['url']) as string | undefined;

    if (!accountUrl) {
      throw new Error('Stripe onboarding link was not returned');
    }

    logger.info('Contractor payout setup initiated', {
      service: 'payments',
      userId: user.id,
    });

    return NextResponse.json({
      accountUrl,
      message: 'Redirecting to Stripe onboarding...',
    });
  } catch (error) {
    logger.error('Error setting up contractor payout', error, { service: 'payments' });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up payout account' },
      { status: 500 }
    );
  }
}

