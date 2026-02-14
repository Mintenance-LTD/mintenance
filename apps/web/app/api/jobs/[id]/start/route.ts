/**
 * POST /api/jobs/:id/start
 * Contractor starts a job after uploading before photos.
 * Transitions job status: assigned → in_progress
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateStatusTransition, type JobStatus } from '@/lib/job-state-machine';
import { notifyJobStatusChange } from '@/lib/services/notifications/NotificationHelper';
import { logger } from '@mintenance/shared';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const jobId = params.id;

    // 1. Fetch job
    const { data: job, error } = await serverSupabase
      .from('jobs')
      .select('id, contractor_id, homeowner_id, status, title')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new NotFoundError('Job not found');
    }

    // 2. Verify contractor is assigned to this job
    if (job.contractor_id !== user.id) {
      throw new ForbiddenError('Only the assigned contractor can start this job');
    }

    // 3. Validate state transition (assigned → in_progress)
    validateStatusTransition(job.status as JobStatus, 'in_progress');

    // 4. Check at least 1 before photo exists
    const { count } = await serverSupabase
      .from('job_photos_metadata')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('photo_type', 'before');

    if (!count || count === 0) {
      throw new BadRequestError(
        'At least one before photo must be uploaded before starting the job'
      );
    }

    // 5. Update job status
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (updateError) {
      logger.error('Failed to update job status', { service: 'jobs', jobId, error: updateError });
      throw new Error('Failed to start job');
    }

    // 6. Notify both parties
    await notifyJobStatusChange({
      jobId,
      jobTitle: job.title || 'Job',
      oldStatus: job.status,
      newStatus: 'in_progress',
      homeownerId: job.homeowner_id,
      contractorId: user.id,
    });

    logger.info('Job started by contractor', {
      service: 'jobs',
      jobId,
      contractorId: user.id,
      beforePhotoCount: count,
    });

    return NextResponse.json({
      success: true,
      message: 'Job started successfully',
    });
  }
);
