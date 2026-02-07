import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/** Type for Supabase edge function error with possible extended properties */
interface EdgeFunctionError extends Error {
  code?: string;
  statusCode?: number;
  stack?: string;
}

/** Type-safe extraction of error properties */
function getErrorDetails(error: unknown): { code?: string; statusCode?: number; stack?: string } {
  if (error && typeof error === 'object') {
    const err = error as EdgeFunctionError;
    return {
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack?.substring(0, 500),
    };
  }
  return {};
}

/**
 * POST /api/contractor/payout/setup
 * Set up Stripe Connect account for contractor payouts
 */
export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can set up payout accounts');
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

    // Invoke Edge Function using direct HTTP call with proper authentication
    // Supabase Edge Functions require BOTH Authorization and apikey headers
    let data: unknown = null;
    let error: unknown = null;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/setup-contractor-payout`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({ contractorId: user.id }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        logger.error('Edge Function HTTP error', {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        }, { service: 'api' });
        error = new Error(`Edge Function error: ${responseText}`);
      } else {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          logger.error('Failed to parse Edge Function response', parseError, { service: 'api' });
          error = new Error('Invalid JSON response from Edge Function');
        }
      }
    } catch (invokeError) {
      // Catch any exception during invocation
      logger.error('Exception during Edge Function invoke', invokeError, { service: 'api' });
      error = invokeError;
    }

    // Log the raw response for debugging
    logger.debug('Edge Function Response', {
      service: 'api',
      hasData: !!data,
      hasError: !!error,
    });

    if (error) {
      const err = error as Error;
      const errorDetails = getErrorDetails(error);
      logger.error('Edge Function returned error', {
        service: 'contractor',
        errorMessage: err?.message,
        errorCode: errorDetails.code,
        errorStatus: errorDetails.statusCode,
        hasData: !!data,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
      });

      // Edge Functions return errors in the data field when status is non-2xx
      // The error object may contain statusCode, message, and the data may contain error details
      // IMPORTANT: When Edge Function returns non-2xx, Supabase client puts the response body in 'data' field
      let errorMessage = err.message || 'Failed to set up payout account';
      let responseErrorDetails: unknown = undefined;
      
      // Try to extract detailed error information from data
      // The Edge Function returns: { error: string, details?: unknown } when there's an error
      if (data) {
        if (typeof data === 'object') {
          // Check for error field in response (from Edge Function)
          if ('error' in data) {
            const errorValue = (data as { error?: unknown }).error;
            if (typeof errorValue === 'string') {
              errorMessage = errorValue;
            } else if (errorValue) {
              errorMessage = String(errorValue);
            }
          }
          // Check for details field (from Edge Function error response)
          if ('details' in data) {
            responseErrorDetails = (data as { details?: unknown }).details;
          }
          // If data itself has a message field
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
        errorDetails: responseErrorDetails,
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
    return handleAPIError(error);
  }
}

