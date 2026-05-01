import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';

// auth-check: ok — public reviews feed shown on the marketplace
// contractor profile (anonymous browsers reading review history before
// they sign up). Same exposure as the homepage trust feed.
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async (_request, { params }) => {
    const { id } = params as { id: string };
    if (!id) {
      logger.warn('Contractor ID missing in request', {
        service: 'contractors',
      });
      throw new BadRequestError('Contractor id missing');
    }

    const { data: reviews, error } = await serverSupabase
      .from('reviews')
      .select(
        `
      id,
      rating,
      comment,
      created_at,
      response,
      response_published_at,
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
    `
      )
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Failed to fetch contractor reviews', error, {
        service: 'contractors',
        contractorId: id,
      });
      return NextResponse.json({ reviews: [] });
    }

    const transformedReviews = (reviews || []).map((review) => {
      const reviewer = Array.isArray(review.reviewer)
        ? review.reviewer[0]
        : review.reviewer;
      const job = Array.isArray(review.job) ? review.job[0] : review.job;
      // R7 #19: only expose the contractor's reply once response_published_at is set.
      const responseIsPublic =
        !!review.response &&
        !!review.response_published_at &&
        new Date(review.response_published_at as string).getTime() <=
          Date.now();
      return {
        id: review.id,
        author: reviewer
          ? `${reviewer?.first_name || ''} ${reviewer?.last_name || ''}`.trim() ||
            'Anonymous'
          : 'Anonymous',
        rating: review.rating,
        date: review.created_at,
        comment: review.comment || '',
        jobType: job?.category || job?.title || 'General Work',
        helpful: 0,
        verified: true,
        response: responseIsPublic ? review.response : null,
        responsePublishedAt: responseIsPublic
          ? review.response_published_at
          : null,
      };
    });

    logger.info('Contractor reviews retrieved successfully', {
      service: 'contractors',
      contractorId: id,
      reviewCount: transformedReviews.length,
    });

    return NextResponse.json({ reviews: transformedReviews });
  }
);
