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
} from '@/lib/errors/api-error';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const jobId = params.id;

    // Get job details
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, contractor_id, homeowner_id, status, title')
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
    } catch (err) {
      throw new BadRequestError(
        `Job cannot be completed from '${job.status}' status. Job must be in progress (requires before photos uploaded and job started).`
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
    const { data: updatedRows, error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        status: JOB_STATUS.COMPLETED,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', JOB_STATUS.IN_PROGRESS)
      .select('id');

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
    await NotificationService.createNotification({
      userId: job.homeowner_id,
      type: 'job_update',
      title: 'How did your contractor do?',
      message: `${job.title || 'Your job'} is done. Two taps to leave a review and release payment.`,
      actionUrl: `/jobs/${jobId}`,
      metadata: { jobId, event: 'job_completed' },
    });

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
        EscrowReleaseAgent.calculateAutoReleaseDate(
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
