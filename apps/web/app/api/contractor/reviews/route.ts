import { NextRequest, NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// GET: Fetch all reviews where the contractor is the reviewee
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (request, { user }) => {
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // 2026-05-24 audit-40 P0: previously selected `updated_at`, but
    // live `reviews` has no such column (verified via
    // information_schema). PostgREST returned 42703 and the route
    // 500'd, breaking the contractor reviews tab entirely. The
    // moderation state lives on response_at / response_published_at
    // / response_blocked_by_admin; the original row's created_at is
    // the only timestamp we have. Drop the stale column reference.
    const { data: reviews, error } = await userDb
      .from('reviews')
      .select(
        `
        id,
        job_id,
        rating,
        comment,
        response,
        response_at,
        response_published_at,
        response_blocked_by_admin,
        created_at,
        reviewer:profiles!reviews_reviewer_id_fkey(id, first_name, last_name, profile_image_url),
        job:jobs!reviews_job_id_fkey(id, title, category)
      `
      )
      .eq('reviewee_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching contractor reviews', error, {
        service: 'reviews',
        userId: user.id,
      });
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
        // R7 #19 — moderation state
        responseAt: (r.response_at as string | null) ?? null,
        responsePublishedAt: (r.response_published_at as string | null) ?? null,
        responseBlockedByAdmin:
          (r.response_blocked_by_admin as boolean | null) ?? false,
        createdAt: r.created_at,
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
    // 2026-05-24 audit-35 P1: previously read AND wrote through the
    // request-scoped (RLS-bound) client. Live reviews RLS only allows
    // UPDATE where `auth.uid() = reviewer_id` — the reviewing
    // homeowner, NOT the contractor being reviewed. So the contractor
    // (reviewee_id) could never update their own row to add a reply
    // and the update silently no-op'd. The in-code reviewee_id check
    // below is the authoritative gate (same pattern the parallel
    // /api/reviews/[id]/reply route uses); switching to serverSupabase
    // after that check restores the intended behaviour while keeping
    // the ownership boundary explicit. We also pre-flight the fetch
    // through serverSupabase so the "review not found" branch doesn't
    // get RLS-hidden into a confusing 404 either.

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
      return NextResponse.json(
        { error: 'Not authorized to respond to this review' },
        { status: 403 }
      );
    }

    if (review.response) {
      return NextResponse.json(
        { error: 'Already responded to this review' },
        { status: 400 }
      );
    }

    // R7 #19: set response_at so the 48h moderation cron picks it up.
    // response_published_at stays NULL until the cron promotes it or an
    // admin overrides.
    //
    // 2026-05-24 audit-40 P0: dropped updated_at — the column does not
    // exist on the live reviews table (verified via information_schema).
    // The update was 42703'ing every reply attempt. response_at already
    // carries the "when did the contractor reply" timestamp the
    // moderation flow needs.
    const { error: updateError } = await serverSupabase
      .from('reviews')
      .update({
        response,
        response_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      logger.error('Error submitting review response', updateError, {
        service: 'reviews',
        userId: user.id,
      });
      throw new InternalServerError('Failed to submit response');
    }

    return NextResponse.json({
      success: true,
      publishedIn: '48 hours',
    });
  }
);
