import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Type definition for schedule update data
interface ScheduleUpdateData {
  scheduled_start_date: string;
  updated_at: string;
  scheduled_end_date?: string | null;
  scheduled_duration_hours?: number | null;
}

const scheduleSchema = z
  .object({
    scheduled_start_date: z.string().datetime(),
    scheduled_end_date: z.string().datetime().nullable().optional(),
    scheduled_duration_hours: z.number().int().positive().optional(),
  })
  .strict();

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, scheduleSchema);
    if ('headers' in validation) return validation;

    const {
      scheduled_start_date,
      scheduled_end_date,
      scheduled_duration_hours,
    } = validation.data;

    // Verify job exists and user has permission
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        'id, homeowner_id, payer_user_id, contractor_id, status, title, scheduled_end_date, updated_at'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Verify user is contractor or homeowner for this job
    const isAuthorized =
      (user.role === 'contractor' && job.contractor_id === user.id) ||
      (user.role === 'homeowner' &&
        (job.homeowner_id === user.id || job.payer_user_id === user.id));

    if (!isAuthorized) {
      throw new ForbiddenError('Not authorized to schedule this job');
    }

    if (!['assigned', 'in_progress'].includes(job.status))
      throw new BadRequestError('Only active assigned jobs can be scheduled');
    const { data: agreement, error: agreementError } = await serverSupabase
      .from('contracts')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .not('contractor_signed_at', 'is', null)
      .not('homeowner_signed_at', 'is', null)
      .maybeSingle();
    if (agreementError) throw new Error('Unable to confirm signed agreement');
    if (!agreement)
      throw new BadRequestError(
        'Both parties must sign the agreement before scheduling'
      );
    const effectiveEnd =
      scheduled_end_date === undefined
        ? job.scheduled_end_date
        : scheduled_end_date;
    if (
      effectiveEnd &&
      Date.parse(effectiveEnd) <= Date.parse(scheduled_start_date)
    )
      throw new BadRequestError('End time must be after the start time');

    // Verify date is in the future
    const startDate = new Date(scheduled_start_date);
    const now = new Date();
    if (startDate <= now) {
      throw new BadRequestError('Scheduled start date must be in the future');
    }

    // Update job with scheduled dates
    const updateData: ScheduleUpdateData = {
      scheduled_start_date: scheduled_start_date,
      updated_at: new Date().toISOString(),
      scheduled_duration_hours: scheduled_duration_hours ?? null,
    };

    if (scheduled_end_date !== undefined) {
      updateData.scheduled_end_date = scheduled_end_date;
    }
    if (scheduled_duration_hours) {
      updateData.scheduled_duration_hours = scheduled_duration_hours;
    }

    const { data: saved, error: updateError } = await serverSupabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('status', job.status)
      .eq('updated_at', job.updated_at)
      .select('id')
      .maybeSingle();

    if (updateError) {
      logger.error('Error updating job schedule', updateError, {
        service: 'jobs',
        jobId,
        userId: user.id,
      });
      throw updateError;
    }

    if (!saved)
      throw new ConflictError(
        'The job changed while you were scheduling. Reload and review the latest dates.'
      );

    // Create notifications for both parties
    const otherPartyId =
      user.role === 'contractor' ? job.homeowner_id : job.contractor_id;
    const formattedDate = new Date(scheduled_start_date).toLocaleDateString(
      'en-GB',
      {
        timeZone: 'Europe/London',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    try {
      // 2026-05-21 Mint Editorial voice — drop the emoji, lead with the
      // job + date so the title alone tells you what you need.
      const jobLabel = job.title || 'the job';
      // 2026-05-25 audit-43 P1: metadata.jobId is what mobile's
      // routingTable reads to deep-link this notification to JobDetails
      // (actionUrl is web-only). Previously both sends omitted metadata,
      // so the mobile tap fell through to the inbox.
      await Promise.all([
        NotificationService.createNotification({
          userId: user.id,
          title: `${jobLabel} scheduled for ${formattedDate}`,
          message:
            'The job window is updated in your calendar. Individual visits and signed agreement dates are unchanged.',
          type: 'job_scheduled',
          actionUrl:
            user.role === 'contractor'
              ? `/contractor/jobs/${jobId}`
              : `/jobs/${jobId}`,
          metadata: { jobId },
        }),
        NotificationService.createNotification({
          userId: otherPartyId,
          title: `${jobLabel} scheduled for ${formattedDate}`,
          message: `Your ${user.role === 'contractor' ? 'contractor' : 'homeowner'} set the start date.`,
          type: 'job_scheduled',
          actionUrl:
            user.role === 'contractor'
              ? `/jobs/${jobId}`
              : `/contractor/jobs/${jobId}`,
          metadata: { jobId },
        }),
      ]);
    } catch (notificationError) {
      logger.error(
        'Failed to create schedule notifications',
        notificationError,
        {
          service: 'jobs',
          jobId,
        }
      );
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: 'Job scheduled successfully',
      scheduled_start_date,
      scheduled_end_date,
    });
  }
);

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Verify job exists and user has permission
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        'id, homeowner_id, payer_user_id, contractor_id, scheduled_start_date, scheduled_end_date, scheduled_duration_hours'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Verify user is contractor or homeowner for this job
    const isAuthorized =
      (user.role === 'contractor' && job.contractor_id === user.id) ||
      (user.role === 'homeowner' &&
        (job.homeowner_id === user.id || job.payer_user_id === user.id));

    if (!isAuthorized) {
      throw new ForbiddenError('Not authorized to view this job schedule');
    }

    return NextResponse.json({
      scheduled_start_date: job.scheduled_start_date,
      scheduled_end_date: job.scheduled_end_date,
      scheduled_duration_hours: job.scheduled_duration_hours,
    });
  }
);
