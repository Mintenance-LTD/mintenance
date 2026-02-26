/**
 * POST /api/jobs/:id/review
 * Submit a review for a completed job.
 * Both homeowners and contractors can review each other.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { roles: ['homeowner', 'contractor'] },
  async (request, { user, params }) => {
    const jobId = params.id;
    const body = await request.json();

    const rating = Number(body.rating);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const wouldRecommend = body.wouldRecommend;

    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5');
    }

    if (!comment || comment.length < 20) {
      throw new BadRequestError('Review comment must be at least 20 characters');
    }

    // Fetch job and verify user is a party to it
    const { data: job, error } = await serverSupabase
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
    const { data: existingReview } = await serverSupabase
      .from('reviews')
      .select('id')
      .eq('job_id', jobId)
      .eq('reviewer_id', user.id)
      .limit(1)
      .single();

    if (existingReview) {
      throw new BadRequestError('You have already reviewed this job');
    }

    // Insert review
    const { data: review, error: insertError } = await serverSupabase
      .from('reviews')
      .insert({
        job_id: jobId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment,
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
      await NotificationService.createNotification({
        userId: revieweeId,
        title: 'New Review',
        message: `You received a ${rating}-star review for "${job.title}"`,
        type: 'review',
        actionUrl: isHomeowner ? `/contractor/reviews` : `/jobs/${jobId}`,
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
