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

    // Update job status to completed
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        status: JOB_STATUS.COMPLETED,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      logger.error('Failed to complete job', {
        service: 'jobs',
        jobId,
        error: updateError.message,
      });
      throw updateError;
    }

    // 2026-05-01 audit follow-up: route through NotificationService so push +
    // user-preference + quiet-hours rules apply. The previous direct
    // `.from('notifications').insert(...)` silently dropped the push channel
    // and used a column (`data`) that no longer exists in production.
    await NotificationService.createNotification({
      userId: job.homeowner_id,
      type: 'job_update',
      title: 'Job Completed',
      message: `Your job "${job.title}" has been marked as completed. Please review and release payment.`,
      actionUrl: `/jobs/${jobId}`,
      metadata: { jobId, event: 'job_completed' },
    });

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
