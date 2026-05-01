/**
 * PATCH /api/bookings/:id/reschedule
 * Reschedule a booking to a new date/time.
 * In Mintenance, bookings ARE jobs — this updates the job's scheduled date.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/errors/api-error';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// replaces manual `typeof newDateTime === 'string'` + `isNaN(date.getTime())`
// double-check. `z.string().datetime()` does the ISO parse server-side
// and returns a deterministic error message.
const rescheduleSchema = z
  .object({
    newDateTime: z.string().datetime({
      message: 'Invalid date format. Use ISO-8601.',
    }),
  })
  .strict();

export const PATCH = withApiHandler(
  { roles: ['homeowner', 'contractor'] },
  async (request, { user, params }) => {
    const jobId = params.id;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = rescheduleSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'newDateTime is required'
      );
    }
    const newDate = new Date(parsed.data.newDateTime);
    if (newDate <= new Date()) {
      throw new BadRequestError('New date must be in the future');
    }

    // Fetch job
    const { data: job, error } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status, title')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new NotFoundError('Booking not found');
    }

    // Only allow rescheduling for non-completed jobs
    if (job.status === 'completed' || job.status === 'cancelled') {
      throw new BadRequestError(
        'Cannot reschedule a completed or cancelled booking'
      );
    }

    const isHomeowner = job.homeowner_id === user.id;
    const isContractor = job.contractor_id === user.id;

    if (!isHomeowner && !isContractor) {
      throw new ForbiddenError('Only booking participants can reschedule');
    }

    // Update schedule
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        scheduled_start_date: newDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      logger.error('Failed to reschedule booking', updateError, {
        service: 'bookings',
        jobId,
        userId: user.id,
      });
      throw new Error('Failed to reschedule');
    }

    // Notify other party
    const otherPartyId = isHomeowner ? job.contractor_id : job.homeowner_id;
    if (otherPartyId) {
      const formattedDate = newDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      try {
        await NotificationService.createNotification({
          userId: otherPartyId,
          title: 'Booking Rescheduled',
          message: `"${job.title}" has been rescheduled to ${formattedDate}`,
          type: 'job_scheduled',
          actionUrl: `/jobs/${jobId}`,
        });
      } catch (notificationError) {
        logger.error(
          'Failed to send reschedule notification',
          notificationError,
          {
            service: 'bookings',
            jobId,
          }
        );
      }
    }

    logger.info('Booking rescheduled', {
      service: 'bookings',
      jobId,
      userId: user.id,
      newDateTime: newDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Booking rescheduled successfully',
    });
  }
);
