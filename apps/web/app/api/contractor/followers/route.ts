import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required to view followers');
    }

    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractor_id') || user.id; // Default to current user
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get list of contractors following the specified contractor
    const { data: followers, error: followersError } = await supabase
      .from('contractor_follows')
      .select(`
        id,
        follower_id,
        created_at,
        contractor:follower_id (
          id,
          first_name,
          last_name,
          profile_image_url,
          city,
          country,
          rating,
          total_jobs_completed
        )
      `)
      .eq('following_id', contractorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (followersError) {
      logger.error('Error fetching followers list', followersError, {
        service: 'contractor_followers',
        userId: user.id,
        contractorId,
      });
      throw new InternalServerError('Failed to fetch followers list');
    }

    interface ContractorData {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_image_url: string | null;
      city: string | null;
      country: string | null;
      rating: number | null;
      total_jobs_completed: number | null;
    }

    interface FollowData {
      id: string;
      follower_id: string;
      created_at: string;
      contractor?: ContractorData | ContractorData[] | null;
    }

    const formattedFollowers = (followers || []).map((follow: FollowData) => {
      const contractor = Array.isArray(follow.contractor) ? follow.contractor[0] : follow.contractor;
      
      return {
        id: follow.id,
        contractor_id: follow.follower_id,
        created_at: follow.created_at,
        contractor: contractor ? {
          id: contractor.id,
          first_name: contractor.first_name,
          last_name: contractor.last_name,
          profile_image_url: contractor.profile_image_url,
          city: contractor.city,
          country: contractor.country,
          rating: contractor.rating,
          total_jobs_completed: contractor.total_jobs_completed,
        } : null,
      };
    });

    return NextResponse.json({
      followers: formattedFollowers,
      total: formattedFollowers.length,
      limit,
      offset
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

