import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withPublicRateLimit } from '@/lib/middleware/public-rate-limiter';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: Params) {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'anonymous'}:${req.url}`,
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

  return withPublicRateLimit(req, async (_request) => getContractorReviews(context), 'resource');
}

async function getContractorReviews(context: Params) {
  try {
    const { id } = await context.params;
    if (!id) {
      logger.warn('Contractor ID missing in request', { service: 'contractors' });
      throw new BadRequestError('Contractor id missing');
    }

    // Fetch reviews with reviewer information
    // Schema: reviews columns: id, job_id, reviewer_id, reviewee_id, rating, comment, response, created_at, updated_at
    const { data: reviews, error } = await serverSupabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer:profiles!reviews_reviewer_id_fkey (
          id,
          first_name,
          last_name,
          profile_image_url
        ),
        job:jobs!reviews_job_id_fkey (
          id,
          title,
          category
        )
      `)
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Failed to fetch contractor reviews', error, {
        service: 'contractors',
        contractorId: id,
      });
      // Return empty reviews on error instead of throwing (table may not have all expected FKs)
      return NextResponse.json({ reviews: [] });
    }

    // Transform reviews to match frontend interface
    const transformedReviews = (reviews || []).map((review) => {
      const reviewer = Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer;
      const job = Array.isArray(review.job) ? review.job[0] : review.job;
      return {
        id: review.id,
        author: reviewer
          ? `${reviewer?.first_name || ''} ${reviewer?.last_name || ''}`.trim() || 'Anonymous'
          : 'Anonymous',
        rating: review.rating,
        date: review.created_at,
        comment: review.comment || '',
        jobType: job?.category || job?.title || 'General Work',
        helpful: 0,
        verified: true,
      };
    });

    logger.info('Contractor reviews retrieved successfully', {
      service: 'contractors',
      contractorId: id,
      reviewCount: transformedReviews.length,
    });

    return NextResponse.json({ reviews: transformedReviews });
  } catch (err) {
    return handleAPIError(err);
  }
}
