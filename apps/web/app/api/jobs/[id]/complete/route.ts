import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PaymentEnforcement } from '@/lib/services/payment/PaymentEnforcement';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';

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
      throw new ForbiddenError('Only the assigned contractor can complete this job');
    }

    // Verify job is in a completable state (must be in_progress - enforces photo workflow)
    if (job.status !== 'in_progress') {
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
          message: paymentCheck.reason || 'All payments must be processed through the platform.',
          requiresPayment: true,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // Update job status to completed
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        status: 'completed',
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

    // Create notification for homeowner
    const { error: notificationError } = await serverSupabase
      .from('notifications')
      .insert({
        user_id: job.homeowner_id,
        title: 'Job Completed',
        message: `Your job "${job.title}" has been marked as completed. Please review and release payment.`,
        type: 'job_update',
        read: false,
        action_url: `/jobs/${jobId}`,
      });

    if (notificationError) {
      logger.error('Failed to create completion notification', {
        service: 'jobs',
        error: notificationError.message,
      });
    }

    // Calculate auto-release date for escrow (async, don't block)
    if (job.contractor_id) {
      const { EscrowReleaseAgent } = await import('@/lib/services/agents/EscrowReleaseAgent');

      // Get escrow transaction for this job
      const { data: escrow } = await serverSupabase
        .from('escrow_transactions')
        .select('id')
        .eq('job_id', jobId)
        .eq('status', 'held')
        .limit(1)
        .single();

      if (escrow) {
        EscrowReleaseAgent.calculateAutoReleaseDate(escrow.id, jobId, job.contractor_id).catch(
          (error) => {
            logger.error('Failed to calculate auto-release date', error, {
              service: 'jobs',
              jobId,
              escrowId: escrow.id,
            });
          }
        );
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
