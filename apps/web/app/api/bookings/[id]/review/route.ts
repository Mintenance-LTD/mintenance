/**
 * POST /api/bookings/:id/review
 * Submit a review for a booking (delegates to job review logic).
 * In Mintenance, bookings ARE jobs — this route provides a booking-friendly alias.
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

    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5');
    }

    // Fetch job and verify user is a party to it
    const { data: job, error } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status, title')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new NotFoundError('Booking not found');
    }

    if (job.status !== 'completed') {
      throw new BadRequestError('Can only review completed bookings');
    }

    const isHomeowner = job.homeowner_id === user.id;
    const isContractor = job.contractor_id === user.id;

    if (!isHomeowner && !isContractor) {
      throw new ForbiddenError('Only booking participants can leave reviews');
    }

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
      throw new BadRequestError('You have already reviewed this booking');
    }

    // Insert review
    const { data: review, error: insertError } = await serverSupabase
      .from('reviews')
      .insert({
        job_id: jobId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment || null,
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Failed to insert booking review', insertError, {
        service: 'reviews',
        jobId,
      });
      throw new Error('Failed to submit review');
    }

    try {
      await NotificationService.createNotification({
        userId: revieweeId,
        title: 'New Review',
        message: `You received a ${rating}-star review for "${job.title}"`,
        type: 'review',
        actionUrl: isHomeowner ? `/contractor/reviews` : `/jobs/${jobId}`,
      });
    } catch (notificationError) {
      logger.error('Failed to send review notification', notificationError, {
        service: 'reviews',
        jobId,
      });
    }

    logger.info('Booking review submitted', {
      service: 'reviews',
      jobId,
      reviewerId: user.id,
      rating,
    });

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      message: 'Review submitted successfully',
    });
  }
);
