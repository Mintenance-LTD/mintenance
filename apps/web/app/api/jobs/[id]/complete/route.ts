import { z } from 'zod';
import {
  getJobReworkRequests,
  getCompletionEvidence,
} from '@/lib/jobs/rework-evidence';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PaymentEnforcement } from '@/lib/services/payment/PaymentEnforcement';
import {
  logger,
  validateStatusTransition,
  JOB_STATUS,
  ESCROW_STATUS,
  type JobStatus,
} from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '@/lib/errors/api-error';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const jobId = params.id;

    // Get job details
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        'id, contractor_id, homeowner_id, payer_user_id, status, title, category'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Verify user is the contractor assigned to this job
    if (job.contractor_id !== user.id) {
      throw new ForbiddenError(
        'Only the assigned contractor can complete this job'
      );
    }

    // Verify job is in a completable state (must be in_progress - enforces photo workflow)
    try {
      validateStatusTransition(
        job.status as JobStatus,
        JOB_STATUS.COMPLETED as JobStatus
      );
    } catch {
      throw new BadRequestError(
        `Job cannot be completed from '${job.status}' status. Job must be in progress (requires before photos uploaded and job started).`
      );
    }

    // Completion is the point at which the homeowner is asked to approve
    // the work. Require the evidence used by that approval before changing
    // the job state; otherwise this endpoint can strand a job as completed
    // while the homeowner's confirmation endpoint correctly refuses it.
    const latestRework = (await getJobReworkRequests(jobId))[0];
    let expectedReworkId: string | null = null;
    if (latestRework) {
      const body = await _request.json().catch(() => null);
      const parsed = z
        .object({ reworkRequestId: z.string().uuid() })
        .safeParse(body);
      expectedReworkId = parsed.success ? parsed.data.reworkRequestId : null;
      if (expectedReworkId !== latestRework.id) {
        throw new ConflictError(
          'Review the latest requested changes and explicitly submit fresh rework evidence.'
        );
      }
    }
    const evidence = await getCompletionEvidence(
      jobId,
      latestRework?.created_at
    );
    const validation = await PhotoVerificationService.validatePhotoRequirements(
      job.category || 'general',
      evidence
    );
    if (!validation.passed) {
      throw new BadRequestError(
        'Completion evidence required for this cycle: ' +
          validation.errors.join('. ')
      );
    }

    // Enforce platform payment - check if payment exists
    const paymentCheck = await PaymentEnforcement.canCompleteJob(jobId);

    if (!paymentCheck.allowed) {
      logger.warn('Job completion blocked - no platform payment', {
        service: 'jobs',
        jobId,
        contractorId: user.id,
        reason: paymentCheck.reason,
      });

      return NextResponse.json(
        {
          error: 'Payment required',
          message:
            paymentCheck.reason ||
            'All payments must be processed through the platform.',
          requiresPayment: true,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // Update job status to completed.
    //
    // 2026-05-24 audit: optimistic lock on the prior status. Without this
    // predicate, two concurrent POST /complete requests both pass the
    // validateStatusTransition read above (job.status === 'in_progress'),
    // both run the UPDATE, and we fan out two `job_update` notifications
    // (one homeowner gets two emails + two pushes for the same event).
    // The .eq('status', JOB_STATUS.IN_PROGRESS) predicate makes the
    // UPDATE a no-op on the loser; .select('id') lets us detect the
    // no-op via row count and bail before the notification fanout.
    const result = latestRework
      ? await serverSupabase.rpc('submit_job_rework', {
          p_job_id: jobId,
          p_actor_id: user.id,
          p_rework_id: expectedReworkId,
        })
      : await serverSupabase
          .from('jobs')
          .update({
            status: JOB_STATUS.COMPLETED,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('status', JOB_STATUS.IN_PROGRESS)
          .select('id');
    const updateError = result.error;
    const updatedRows = latestRework
      ? result.data === true
        ? [{ id: jobId }]
        : []
      : result.data;
    if (updateError?.code === '23514')
      throw new ConflictError(
        'The job or evidence changed. Reload and check the current cycle before submitting.'
      );

    if (updateError) {
      logger.error('Failed to complete job', {
        service: 'jobs',
        jobId,
        error: updateError.message,
      });
      throw updateError;
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Status changed between the read above and this update — most
      // commonly a duplicate POST from a flaky mobile network. Treat
      // as idempotent success: the job is already completed (or moved
      // on to disputed/cancelled), so the second caller doesn't need
      // to fan out notifications a second time.
      logger.info(
        'Job completion no-op — status changed between read and update',
        {
          service: 'jobs',
          jobId,
          contractorId: user.id,
        }
      );
      return NextResponse.json({
        success: true,
        message: 'Job already completed',
        idempotent: true,
      });
    }

    // 2026-05-01 audit follow-up: route through NotificationService so push +
    // user-preference + quiet-hours rules apply. The previous direct
    // `.from('notifications').insert(...)` silently dropped the push channel
    // and used a column (`data`) that no longer exists in production.
    // 2026-05-21 Mint Editorial voice — matches the after-photos
    // review nudge phrasing so push + in-app land consistently.
    const customerIds = [
      ...new Set([job.homeowner_id, job.payer_user_id].filter(Boolean)),
    ];
    await Promise.all(
      customerIds.map((customerId) =>
        NotificationService.createNotification({
          userId: customerId,
          type: 'job_update',
          title: 'How did your contractor do?',
          message: `${job.title || 'Your job'} is done. Review the current evidence and approve or request changes. Payment remains subject to its release checks.`,
          actionUrl: `/jobs/${jobId}`,
          metadata: { jobId, event: 'job_completed' },
        })
      )
    );

    // R7 #8 neighbour referral: if the homeowner redeemed a referral
    // and this is their first completed job, credit £20 to both
    // parties. Non-fatal if it fails.
    //
    // 2026-05-25 audit-45 P1: previously this hook only fired from
    // photos/after/route.ts (the auto-completion path). If a
    // contractor completes via this explicit route — which is wired up
    // for legacy + manual-complete flows — the homeowner's first-job
    // referral reward was silently never applied. applyRewardOnFirstJob
    // is idempotent (checks status='redeemed' + flips to 'rewarded'),
    // so firing it from both paths is safe.
    try {
      const { NeighbourhoodReferralService } =
        await import('@/lib/services/referrals/NeighbourhoodReferralService');
      await NeighbourhoodReferralService.applyRewardOnFirstJob(
        job.homeowner_id,
        jobId
      );
    } catch (refErr) {
      logger.warn('Referral reward hook failed', {
        service: 'jobs',
        jobId,
        err: refErr instanceof Error ? refErr.message : String(refErr),
      });
    }

    // Calculate auto-release date for escrow (async, don't block)
    if (job.contractor_id) {
      const { EscrowReleaseAgent } =
        await import('@/lib/services/agents/EscrowReleaseAgent');

      // Get escrow transaction for this job
      const { data: escrow } = await serverSupabase
        .from('escrow_transactions')
        .select('id')
        .eq('job_id', jobId)
        .eq('status', ESCROW_STATUS.HELD)
        .limit(1)
        .single();

      if (escrow) {
        await EscrowReleaseAgent.calculateAutoReleaseDate(
          escrow.id,
          jobId,
          job.contractor_id
        ).catch((error) => {
          logger.error('Failed to calculate auto-release date', error, {
            service: 'jobs',
            jobId,
            escrowId: escrow.id,
          });
        });
      }
    }

    logger.info('Job completed successfully', {
      service: 'jobs',
      jobId,
      contractorId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Job marked as completed',
    });
  }
);
