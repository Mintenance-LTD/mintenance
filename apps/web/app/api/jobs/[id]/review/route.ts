/**
 * POST /api/jobs/:id/review
 * Submit a review for a completed job.
 * Both homeowners and contractors can review each other.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/errors/api-error';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// (rating 1-5, comment min 20 / max 2000) replaces the manual numeric +
// length checks.
// 2026-05-24 audit-35 P2: max(2000) disagreed with the live DB
// CHECK constraint reviews_comment_length_check (length(comment) <=
// 1000). A 1001-2000 char comment passed Zod, then the insert
// 23514'd as a generic "Failed to submit review" 500. Tighten the
// schema to match the constraint so app-level validation gives the
// caller a useful message instead of a database round-trip.
const jobReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z
      .string()
      .min(20, 'Review comment must be at least 20 characters')
      .max(1000, 'Review comment must be at most 1000 characters'),
    wouldRecommend: z.boolean().optional(),
  })
  .strict();

/**
 * GET /api/jobs/:id/review?user_id=...
 * Check if a user has already reviewed this job.
 */
export const GET = withApiHandler(
  { csrf: false },
  async (request, { user, params }) => {
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const jobId = params.id;
    // SECURITY: Always use authenticated user's ID. No user_id parameter override (IDOR fix).
    const userId = user.id;

    const { data: reviews, error: reviewError } = await userDb
      .from('reviews')
      .select('id, rating, comment, would_recommend, created_at')
      .eq('job_id', jobId)
      .eq('reviewer_id', userId);

    if (reviewError) {
      logger.error('Failed to fetch reviews', {
        service: 'reviews',
        jobId,
        userId,
        error: reviewError.message,
      });
      return NextResponse.json({ reviews: [] });
    }

    return NextResponse.json({ reviews: reviews || [] });
  }
);

export const POST = withApiHandler(
  { roles: ['homeowner', 'contractor'] },
  async (request, { user, params }) => {
    // Use RLS-enforced client for user-scoped operations; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const jobId = params.id;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = jobReviewSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Invalid review payload'
      );
    }
    const { rating, comment: rawComment, wouldRecommend } = parsed.data;
    const comment = rawComment.trim();

    // Fetch job and verify user is a party to it
    const { data: job, error } = await userDb
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status, title')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status !== 'completed') {
      throw new BadRequestError('Can only review completed jobs');
    }

    const isHomeowner = job.homeowner_id === user.id;
    const isContractor = job.contractor_id === user.id;

    if (!isHomeowner && !isContractor) {
      throw new ForbiddenError('Only job participants can leave reviews');
    }

    // Determine who is being reviewed
    const revieweeId = isHomeowner ? job.contractor_id : job.homeowner_id;

    // Check for duplicate review
    const { data: existingReview } = await userDb
      .from('reviews')
      .select('id')
      .eq('job_id', jobId)
      .eq('reviewer_id', user.id)
      .limit(1)
      .single();

    if (existingReview) {
      throw new BadRequestError('You have already reviewed this job');
    }

    // Insert review.
    // 2026-05-09: persist `would_recommend` (column added by
    // 20260509155315_reviews_would_recommend_column). Prior version
    // accepted the field and silently dropped it.
    const { data: review, error: insertError } = await userDb
      .from('reviews')
      .insert({
        job_id: jobId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment,
        would_recommend: wouldRecommend ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Failed to insert review', {
        service: 'reviews',
        jobId,
        error: insertError.message,
      });
      throw new Error('Failed to submit review');
    }

    // Notify the reviewee — wrapped in try/catch so a notification failure
    // never causes a 500 after the review has already been successfully stored.
    try {
      // 2026-05-21 Mint Editorial voice — show the star count visually.
      const stars = '★'.repeat(rating);
      // 2026-05-23 audit-16 P2: include jobId in metadata so the mobile
      // routing table can deep-link to JobDetails. Without this the
      // 'review' notification fell back to the inbox on mobile (only
      // 'review_requested' was routed) and the contractor's "Tap to
      // read it and reply" CTA went nowhere useful.
      await NotificationService.createNotification({
        userId: revieweeId,
        title: `${stars} review on ${job.title}`,
        message: `Tap to read it and reply if you want to.`,
        type: 'review',
        actionUrl: isHomeowner ? `/contractor/reviews` : `/jobs/${jobId}`,
        metadata: { jobId, reviewId: review.id, rating },
      });

      // Check for 5-star review milestones (contractors only)
      if (isHomeowner && rating === 5) {
        const { count: fiveStarCount, error: countError } = await serverSupabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('reviewee_id', revieweeId)
          .eq('rating', 5);

        if (countError) {
          logger.error('Failed to count 5-star reviews for milestone check', {
            service: 'reviews',
            jobId,
            revieweeId,
            error: countError.message,
          });
        } else {
          const milestones = [10, 25, 50, 100];
          if (fiveStarCount !== null && milestones.includes(fiveStarCount)) {
            await NotificationService.createNotification({
              userId: revieweeId,
              title: `🌟 ${fiveStarCount} Five-Star Reviews!`,
              message: `Congratulations! You've just received your ${fiveStarCount}th 5-star review. Your outstanding work is getting noticed.`,
              type: 'review_milestone',
              actionUrl: '/contractor/reviews',
              metadata: { milestone: fiveStarCount },
            });
          }
        }
      }
    } catch (notificationError) {
      logger.error('Failed to send review notifications', notificationError, {
        service: 'reviews',
        jobId,
        revieweeId,
      });
    }

    logger.info('Review submitted', {
      service: 'reviews',
      jobId,
      reviewerId: user.id,
      revieweeId,
      rating,
    });

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      message: 'Review submitted successfully',
    });
  }
);
