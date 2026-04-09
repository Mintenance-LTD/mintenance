import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
    // DB schema: job_views(id, job_id, viewer_id, ip_address, user_agent, referrer, viewed_at)
    const { data: existingView } = await serverSupabase
      .from('job_views')
      .select('id, viewed_at')
      .eq('job_id', jobId)
      .eq('viewer_id', user.id)
      .single();

    const isFirstView = !existingView;

    // Insert new view record (no upsert — schema doesn't have view_count)
    let viewError;
    if (isFirstView) {
      const { error } = await serverSupabase.from('job_views').insert({
        job_id: jobId,
        viewer_id: user.id,
        ip_address:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
        referrer: request.headers.get('referer')?.slice(0, 500) || null,
      });
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

    // Create notification for homeowner on first view only
    if (isFirstView && job.homeowner_id) {
      try {
        // Get contractor name
        const { data: contractor } = await serverSupabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const contractorName = contractor
          ? `${contractor.first_name} ${contractor.last_name}`
          : 'A contractor';

        const { error: notificationError } = await serverSupabase
          .from('notifications')
          .insert({
            user_id: job.homeowner_id,
            title: 'Job Viewed',
            message: `${contractorName} viewed your job "${job.title}"`,
            type: 'job_viewed',
            read: false,
            action_url: `/jobs/${jobId}`,
            created_at: new Date().toISOString(),
          });

        if (notificationError) {
          logger.error(
            'Failed to create notification for homeowner',
            notificationError,
            {
              service: 'jobs',
              homeownerId: job.homeowner_id,
              jobId,
            }
          );
        } else {
          logger.info('Notification created for homeowner', {
            service: 'jobs',
            homeownerId: job.homeowner_id,
            jobId,
            contractorId: user.id,
          });
        }
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
