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
    const { data: reviews, error } = await serverSupabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        review_text,
        created_at,
        is_verified,
        photos,
        reviewer:reviewer_id (
          id,
          first_name,
          last_name,
          profile_image_url
        ),
        job:job_id (
          id,
          title,
          category
        )
      `)
      .eq('contractor_id', id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Failed to fetch contractor reviews', error, {
        service: 'contractors',
        contractorId: id,
      });
      throw error;
    }

    // Transform reviews to match frontend interface
    const transformedReviews = (reviews || []).map((review: any) => ({
      id: review.id,
      author: review.reviewer
        ? `${review.reviewer.first_name || ''} ${review.reviewer.last_name || ''}`.trim() || 'Anonymous'
        : 'Anonymous',
      rating: review.rating,
      date: review.created_at,
      comment: review.review_text || '',
      jobType: review.job?.category || review.job?.title || 'General Work',
      helpful: 0, // TODO: Add helpful votes feature
      verified: review.is_verified || false,
      photos: review.photos || [],
    }));

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
