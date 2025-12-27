import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

/**
 * Track when a contractor views a job
 * POST /api/jobs/[id]/track-view
 */
export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to track job views');
    }

    // Only contractors can track views
    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can track job views');
    }

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
    const { data: existingView } = await serverSupabase
      .from('job_views')
      .select('id, view_count, viewed_at')
      .eq('job_id', jobId)
      .eq('contractor_id', user.id)
      .single();

    const isFirstView = !existingView;
    const now = new Date().toISOString();

    // Insert or update view (upsert with proper view_count handling)
    let viewError;
    if (isFirstView) {
      // First view - insert new record
      const { error } = await serverSupabase
        .from('job_views')
        .insert({
          job_id: jobId,
          contractor_id: user.id,
          viewed_at: now,
          last_viewed_at: now,
          view_count: 1,
        });
      viewError = error;
    } else {
      // Update existing view - increment view_count
      const { error } = await serverSupabase
        .from('job_views')
        .update({
          last_viewed_at: now,
          view_count: (existingView.view_count || 0) + 1,
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

    // Create notification for homeowner on first view only
    if (isFirstView && job.homeowner_id) {
      try {
        // Get contractor name
        const { data: contractor } = await serverSupabase
          .from('users')
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
          logger.error('Failed to create notification for homeowner', notificationError, {
            service: 'jobs',
            homeownerId: job.homeowner_id,
            jobId,
          });
        } else {
          logger.info('Notification created for homeowner', {
            service: 'jobs',
            homeownerId: job.homeowner_id,
            jobId,
            contractorId: user.id,
          });
        }
      } catch (notificationError) {
        logger.error('Unexpected error creating notification', notificationError, {
          service: 'jobs',
          homeownerId: job.homeowner_id,
          jobId,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}

