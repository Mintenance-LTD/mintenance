import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Portfolio Mode: property list endpoint.
 * This is intentionally separate from /api/properties so we can paywall new
 * landlord/agent workflows without breaking existing homeowner features.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
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
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const blocked = await requirePortfolioModeSubscription(request);
    if (blocked) {
      return blocked;
    }

    const { data, error } = await serverSupabase
      .from('properties')
      .select('id, property_name, property_type, address, city, postcode, is_primary, created_at, updated_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      feature: 'portfolio_mode',
      properties: data || [],
    });
  } catch (err) {
    return handleAPIError(err);
  }
}
