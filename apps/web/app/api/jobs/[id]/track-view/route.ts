import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/**
 * Track when a contractor views a job
 * POST /api/jobs/[id]/track-view
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Verify job exists and get homeowner info
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Check if this contractor has already viewed this job
    // Live DB schema: job_views(id, job_id, viewer_id, viewed_at, view_count, last_viewed_at, updated_at)
    const { data: existingView } = await serverSupabase
      .from('job_views')
      .select('id, view_count, viewed_at')
      .eq('job_id', jobId)
      .eq('viewer_id', user.id)
      .single();

    const isFirstView = !existingView;
    const now = new Date().toISOString();

    let viewError;
    if (isFirstView) {
      const { error } = await serverSupabase.from('job_views').insert({
        job_id: jobId,
        viewer_id: user.id,
        viewed_at: now,
        last_viewed_at: now,
        view_count: 1,
      });
      viewError = error;
    } else {
      // Update existing view — increment view_count
      const { error } = await serverSupabase
        .from('job_views')
        .update({
          last_viewed_at: now,
          view_count: (existingView.view_count || 0) + 1,
          updated_at: now,
        })
        .eq('id', existingView.id);
      viewError = error;
    }

    if (viewError) {
      logger.error('Error tracking job view', viewError, {
        service: 'jobs',
        jobId,
        contractorId: user.id,
      });
      throw viewError;
    }

    // 2026-05-01 audit follow-up: route through NotificationService so this
    // observability ping respects per-user prefs + quiet hours and lights up
    // push (the previous direct insert silently dropped push entirely).
    if (isFirstView && job.homeowner_id) {
      try {
        const { data: contractor } = await serverSupabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const contractorName = contractor
          ? `${contractor.first_name} ${contractor.last_name}`
          : 'A contractor';

        await NotificationService.createNotification({
          userId: job.homeowner_id,
          type: 'job_viewed',
          title: 'Job Viewed',
          message: `${contractorName} viewed your job "${job.title}"`,
          actionUrl: `/jobs/${jobId}`,
          metadata: { jobId, viewerId: user.id, event: 'job_viewed' },
        });

        logger.info('Notification created for homeowner', {
          service: 'jobs',
          homeownerId: job.homeowner_id,
          jobId,
          contractorId: user.id,
        });
      } catch (notificationError) {
        logger.error(
          'Unexpected error creating notification',
          notificationError,
          {
            service: 'jobs',
            homeownerId: job.homeowner_id,
            jobId,
          }
        );
      }
    }

    return NextResponse.json({ success: true });
  }
);
