import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SchedulingAgent } from '@/lib/services/agents/SchedulingAgent';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Type definition for schedule update data
interface ScheduleUpdateData {
  scheduled_start_date: string;
  updated_at: string;
  scheduled_end_date?: string;
  scheduled_duration_hours?: number;
}

const scheduleSchema = z.object({
  scheduled_start_date: z.string().datetime(),
  scheduled_end_date: z.string().datetime().optional(),
  scheduled_duration_hours: z.number().int().positive().optional(),
});

export const POST = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const jobId = params.id as string;

  // Validate and sanitize input using Zod schema
  const validation = await validateRequest(request, scheduleSchema);
  if ('headers' in validation) return validation;

  const { scheduled_start_date, scheduled_end_date, scheduled_duration_hours } = validation.data;

  // Verify job exists and user has permission
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('id, homeowner_id, contractor_id, status, title')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new NotFoundError('Job not found');
  }

  // Verify user is contractor or homeowner for this job
  const isAuthorized = (user.role === 'contractor' && job.contractor_id === user.id) ||
                       (user.role === 'homeowner' && job.homeowner_id === user.id);

  if (!isAuthorized) {
    throw new ForbiddenError('Not authorized to schedule this job');
  }

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
  };

  if (scheduled_end_date) {
    updateData.scheduled_end_date = scheduled_end_date;
  }
  if (scheduled_duration_hours) {
    updateData.scheduled_duration_hours = scheduled_duration_hours;
  }

  const { error: updateError } = await serverSupabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId);

  if (updateError) {
    logger.error('Error updating job schedule', updateError, {
      service: 'jobs',
      jobId,
      userId: user.id,
    });
    throw updateError;
  }

  // Create notifications for both parties
  const otherPartyId = user.role === 'contractor' ? job.homeowner_id : job.contractor_id;
  const formattedDate = new Date(scheduled_start_date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    await Promise.all([
      NotificationService.createNotification({
        userId: user.id,
        title: 'Job Scheduled ✅',
        message: `You've scheduled "${job.title || 'the job'}" to start on ${formattedDate}.`,
        type: 'job_scheduled',
        actionUrl: user.role === 'contractor' ? `/contractor/jobs/${jobId}` : `/jobs/${jobId}`,
      }),
      NotificationService.createNotification({
        userId: otherPartyId,
        title: 'Job Scheduled 📅',
        message: `${user.role === 'contractor' ? 'Contractor' : 'Homeowner'} has scheduled "${job.title || 'the job'}" to start on ${formattedDate}.`,
        type: 'job_scheduled',
        actionUrl: user.role === 'contractor' ? `/jobs/${jobId}` : `/contractor/jobs/${jobId}`,
      }),
    ]);
  } catch (notificationError) {
    logger.error('Failed to create schedule notifications', notificationError, {
      service: 'jobs',
      jobId,
    });
    // Don't fail the request
  }

  // Schedule reminder notifications (24 hours and 1 hour before)
  const startDateObj = new Date(scheduled_start_date);
  const reminder24h = new Date(startDateObj.getTime() - 24 * 60 * 60 * 1000);
  const reminder1h = new Date(startDateObj.getTime() - 60 * 60 * 1000);

  // Get schedule suggestions from SchedulingAgent
  // Run asynchronously to avoid blocking the response
  SchedulingAgent.suggestOptimalSchedule(jobId, {
    jobId,
    userId: user.id,
  }).catch((error) => {
    logger.error('Error getting schedule suggestions', error, {
      service: 'schedule',
      jobId,
    });
  });

  // Note: These should be handled by a cron job that checks for notifications with future created_at dates
  // and sends them at the appropriate time. For MVP, we'll log them but note they need a scheduler.
  try {
    logger.info('Reminder notifications scheduled', {
      service: 'jobs',
      jobId,
      reminder24h: reminder24h.toISOString(),
      reminder1h: reminder1h.toISOString(),
    });
  } catch (reminderError) {
    logger.error('Failed to schedule reminders', reminderError, {
      service: 'jobs',
      jobId,
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Job scheduled successfully',
    scheduled_start_date,
    scheduled_end_date,
  });
});

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const jobId = params.id as string;

  // Verify job exists and user has permission
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('id, homeowner_id, contractor_id, scheduled_start_date, scheduled_end_date, scheduled_duration_hours')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new NotFoundError('Job not found');
  }

  // Verify user is contractor or homeowner for this job
  const isAuthorized = (user.role === 'contractor' && job.contractor_id === user.id) ||
                       (user.role === 'homeowner' && job.homeowner_id === user.id);

  if (!isAuthorized) {
    throw new ForbiddenError('Not authorized to view this job schedule');
  }

  return NextResponse.json({
    scheduled_start_date: job.scheduled_start_date,
    scheduled_end_date: job.scheduled_end_date,
    scheduled_duration_hours: job.scheduled_duration_hours,
  });
});
