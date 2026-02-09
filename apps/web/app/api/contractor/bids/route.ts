import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@/lib/logger';
import { handleAPIError, UnauthorizedError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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

    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to view bids');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can view bids');
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Fetch contractor's bids with job details and homeowner info
    let query = serverSupabase
      .from('bids')
      .select(
        `
        id,
        job_id,
        amount,
        description,
        status,
        created_at,
        updated_at,
        jobs (
          id,
          title,
          description,
          budget,
          location,
          category,
          status,
          created_at,
          photos,
          homeowner_id,
          homeowner:profiles!jobs_homeowner_id_fkey (
            id,
            first_name,
            last_name,
            email,
            profile_image_url
          )
        )
      `
      )
      .eq('contractor_id', user.id);

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    query = query.order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: bids, error } = await query;

    if (error) {
      logger.error('Failed to fetch contractor bids', {
        service: 'contractor',
        contractorId: user.id,
        error: error.message,
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      bids: bids || [],
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

