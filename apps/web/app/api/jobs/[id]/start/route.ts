/**
 * POST /api/jobs/:id/start
 * Contractor starts a job after uploading before photos.
 * Transitions job status: assigned → in_progress
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import {
  validateStatusTransition,
  type JobStatus,
} from '@/lib/job-state-machine';
import { notifyJobStatusChange } from '@/lib/services/notifications/NotificationHelper';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';
import { logger } from '@mintenance/shared';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/errors/api-error';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
} from '@/lib/idempotency';

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const jobId = params.id;

    // 0. Idempotency — guard against double-tap, network retries, or
    //    background-task re-fires. Without this, a retried request
    //    would re-fan out notifications + re-send the job-started
    //    email even though the status transition itself is already
    //    blocked (validateStatusTransition rejects in_progress→
    //    in_progress). AUDIT_PUNCH_LIST P2 #75.
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'job_start',
      user.id,
      jobId
    );
    const idem = await checkIdempotency<{
      success: boolean;
      message: string;
    }>(idempotencyKey, 'job_start');
    if (idem?.isDuplicate && idem.cachedResult) {
      logger.info('Duplicate job_start — returning cached result', {
        service: 'jobs',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idem.cachedResult);
    }

    return await releaseOnError(idempotencyKey, 'job_start', async () => {
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
        throw new ForbiddenError(
          'Only the assigned contractor can start this job'
        );
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
        logger.error('Failed to update job status', {
          service: 'jobs',
          jobId,
          error: updateError,
        });
        throw new Error('Failed to start job');
      }

      // 6. Notify both parties (homeowner + contractor). Capture the
      //    homeowner notification id so we can flip `email_sent = true`
      //    on that row once the job-started email is accepted below —
      //    same pattern as /api/payments/confirm-intent.
      const { homeownerNotifId } = await notifyJobStatusChange({
        jobId,
        jobTitle: job.title || 'Job',
        oldStatus: job.status,
        newStatus: 'in_progress',
        homeownerId: job.homeowner_id,
        contractorId: user.id,
      });

      // R6 #5 deferred: fan out to the NEW stakeholder roles that
      // notifyJobStatusChange doesn't know about — the designated payer
      // (landlord / agency) and any active tenants on the property.
      // Emails are sent to email-only tenants (no account yet) too.
      try {
        const { notifyStakeholders } =
          await import('@/lib/services/notifications/JobStakeholderNotifier');
        const title = job.title || 'your job';
        await notifyStakeholders({
          jobId,
          type: 'job_started',
          onlyRoles: ['payer', 'tenant'],
          titleFor: (role) =>
            role === 'tenant' ? 'Work started at your home' : 'Work started',
          messageFor: (role) =>
            role === 'tenant'
              ? `A contractor has started work on "${title}". They'll be at the property today.`
              : `Work has started on "${title}".`,
          actionUrlFor: () => `/jobs/${jobId}`,
          emailTenants: true,
          tenantJobStatus: 'in_progress',
          skipUserId: user.id,
        });
      } catch (fanoutErr) {
        logger.warn('Stakeholder fan-out on job start failed', {
          service: 'jobs',
          jobId,
          err:
            fanoutErr instanceof Error ? fanoutErr.message : String(fanoutErr),
        });
      }

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
          const homeownerName =
            homeownerProfile.first_name && homeownerProfile.last_name
              ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`
              : 'there';
          const contractorName = contractorProfile
            ? contractorProfile.first_name && contractorProfile.last_name
              ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
              : contractorProfile.company_name || 'Your contractor'
            : 'Your contractor';

          const emailOk = await EmailService.sendJobStartedEmail(
            homeownerProfile.email,
            {
              homeownerName,
              contractorName,
              jobTitle: job.title || 'Job',
              viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/jobs/${jobId}`,
            }
          );
          if (emailOk) {
            await NotificationService.markEmailSent(homeownerNotifId);
          }
        }
      } catch (emailError) {
        logger.error('Failed to send job started email', emailError, {
          service: 'jobs',
          jobId,
        });
      }

      logger.info('Job started by contractor', {
        service: 'jobs',
        jobId,
        contractorId: user.id,
        beforePhotoCount: count,
      });

      const responseData = {
        success: true,
        message: 'Job started successfully',
      };

      await storeIdempotencyResult(
        idempotencyKey,
        'job_start',
        responseData,
        user.id,
        { jobId, contractorId: user.id }
      );

      return NextResponse.json(responseData);
    });
  }
);
