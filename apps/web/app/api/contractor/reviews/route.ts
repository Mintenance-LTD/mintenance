import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// GET: Fetch all reviews where the contractor is the reviewee
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const { data: reviews, error } = await serverSupabase
      .from('reviews')
      .select(`
        id,
        job_id,
        rating,
        comment,
        response,
        created_at,
        updated_at,
        reviewer:profiles!reviews_reviewer_id_fkey(id, first_name, last_name, profile_image_url),
        job:jobs!reviews_job_id_fkey(id, title, category)
      `)
      .eq('reviewee_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching contractor reviews', error, { service: 'reviews', userId: user.id });
      throw new InternalServerError('Failed to fetch reviews');
    }

    const mapped = (reviews || []).map((r: Record<string, unknown>) => {
      const reviewer = r.reviewer as Record<string, unknown> | null;
      const job = r.job as Record<string, unknown> | null;
      return {
        id: r.id,
        jobId: r.job_id,
        jobTitle: job?.title || 'Untitled Job',
        jobCategory: job?.category || '',
        client: reviewer
          ? `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim()
          : 'Anonymous',
        clientAvatar: reviewer?.profile_image_url || null,
        rating: r.rating,
        comment: r.comment || '',
        response: r.response || null,
        responded: !!r.response,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    // Compute stats
    const total = mapped.length;
    const ratingSum = mapped.reduce((sum, r) => sum + Number(r.rating), 0);
    const avg = total > 0 ? ratingSum / total : 0;
    const responded = mapped.filter((r) => r.responded).length;

    return NextResponse.json({
      reviews: mapped,
      stats: {
        totalReviews: total,
        averageRating: Math.round(avg * 10) / 10,
        responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      },
    });
  }
);

const responseSchema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().min(1).max(2000),
});

// POST: Submit a response to a review
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const validation = await validateRequest(request, responseSchema);
    if (validation instanceof NextResponse) return validation;

    const { reviewId, response } = validation.data;

    // Verify this review belongs to the contractor
    const { data: review, error: fetchError } = await serverSupabase
      .from('reviews')
      .select('id, reviewee_id, response')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.reviewee_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to respond to this review' }, { status: 403 });
    }

    if (review.response) {
      return NextResponse.json({ error: 'Already responded to this review' }, { status: 400 });
    }

    const { error: updateError } = await serverSupabase
      .from('reviews')
      .update({ response, updated_at: new Date().toISOString() })
      .eq('id', reviewId);

    if (updateError) {
      logger.error('Error submitting review response', updateError, { service: 'reviews', userId: user.id });
      throw new InternalServerError('Failed to submit response');
    }

    return NextResponse.json({ success: true });
  }
);
