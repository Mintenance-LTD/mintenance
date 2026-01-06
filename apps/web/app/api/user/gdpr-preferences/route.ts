import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { checkGDPRRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { handleAPIError, UnauthorizedError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/user/gdpr-preferences
 * Get user's GDPR preferences
 */
export async function GET(request: NextRequest) {
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

    // Rate limiting for GDPR endpoints
    const rateLimitResponse = await checkGDPRRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { data, error } = await serverSupabase
      .from('user_preferences')
      .select('gdpr_preferences')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logger.error('Failed to fetch GDPR preferences', error);
      throw new InternalServerError('Failed to fetch preferences');
    }

    return NextResponse.json({
      preferences: data?.gdpr_preferences || {
        dataProcessing: true,
        marketing: false,
        analytics: false,
        dataSharing: false,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/user/gdpr-preferences
 * Update user's GDPR preferences
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

    // Rate limiting for GDPR endpoints
    const rateLimitResponse = await checkGDPRRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      throw new BadRequestError('Invalid preferences data');
    }

    // Ensure dataProcessing is always true (required for service)
    const validPreferences = {
      ...preferences,
      dataProcessing: true,
    };

    // Upsert preferences
    const { error: upsertError } = await serverSupabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        gdpr_preferences: validPreferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      logger.error('Failed to save GDPR preferences', upsertError);
      throw new InternalServerError('Failed to save preferences');
    }

    logger.info('GDPR preferences updated', { userId: user.id });

    return NextResponse.json({
      success: true,
      preferences: validPreferences,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

