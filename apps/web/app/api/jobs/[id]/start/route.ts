/**
 * POST /api/jobs/:id/start
 * Contractor starts a job after uploading before photos.
 * Transitions job status: assigned → in_progress
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
import { validateStatusTransition, type JobStatus } from '@/lib/job-state-machine';
import { notifyJobStatusChange } from '@/lib/services/notifications/NotificationHelper';
import { EmailService } from '@/lib/email-service';
import { logger } from '@mintenance/shared';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const jobId = params.id;

    // 1. Fetch job (user-scoped read)
    const { data: job, error } = await userDb
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

    // 4. Verify contract is signed by both parties (user-scoped read)
    const { data: contract } = await userDb
      .from('contracts')
      .select('id, status')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .limit(1)
      .single();

    if (!contract) {
      throw new BadRequestError(
        'Contract must be signed by both parties before starting the job'
      );
    }

    // 5. Verify escrow payment is funded (user-scoped read)
    const { data: escrow } = await userDb
      .from('escrow_transactions')
      .select('id, status')
      .eq('job_id', jobId)
      .eq('status', 'held')
      .limit(1)
      .single();

    if (!escrow) {
      throw new BadRequestError(
        'Payment must be secured in escrow before starting the job'
      );
    }

    // 6. Check at least 1 before photo exists (user-scoped read)
    const { count } = await userDb
      .from('job_photos_metadata')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('photo_type', 'before');

    if (!count || count === 0) {
      throw new BadRequestError(
        'At least one before photo must be uploaded before starting the job'
      );
    }

    // 7. Update job status
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

    // Send email to homeowner that work has started
    try {
      const { data: homeownerProfile } = await serverSupabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', job.homeowner_id)
        .single();

      const { data: contractorProfile } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('id', user.id)
        .single();

      if (homeownerProfile?.email) {
        const homeownerName = homeownerProfile.first_name && homeownerProfile.last_name
          ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`
          : 'there';
        const contractorName = contractorProfile
          ? (contractorProfile.first_name && contractorProfile.last_name
              ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
              : contractorProfile.company_name || 'Your contractor')
          : 'Your contractor';

        await EmailService.sendJobStartedEmail(homeownerProfile.email, {
          homeownerName,
          contractorName,
          jobTitle: job.title || 'Job',
          viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/jobs/${jobId}`,
        });
      }
    } catch (emailError) {
      logger.error('Failed to send job started email', emailError, { service: 'jobs', jobId });
    }

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
