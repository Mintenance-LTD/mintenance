/**
 * POST /api/jobs/:id/terminate-contractor
 * Homeowner terminates the contractor assignment.
 * Transitions job: assigned|in_progress → posted (re-opens for new bids)
 * Handles escrow refund if payment was held.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  logger,
  JOB_STATUS,
  ESCROW_STATUS,
  validateStatusTransition,
  validateEscrowTransition,
  type JobStatus,
  type EscrowStatusValue,
} from '@mintenance/shared';
import { requireJobOwnership } from '@/lib/security/ownership-validators';
import { notifyJobStatusChange } from '@/lib/services/notifications/NotificationHelper';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const terminateSchema = z.object({
  reason: z
    .string()
    .min(10, 'Please provide a reason (at least 10 characters)')
    .max(1000),
});

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Validate input
    const validation = await validateRequest(request, terminateSchema);
    if ('headers' in validation) return validation;
    const { reason } = validation.data;

    // Verify homeowner owns this job
    const job = await requireJobOwnership(
      jobId,
      user.id,
      'homeowner',
      'completion_confirmed_by_homeowner'
    );

    // Only allow termination from assigned or in_progress states
    if (
      job.status !== JOB_STATUS.ASSIGNED &&
      job.status !== JOB_STATUS.IN_PROGRESS
    ) {
      throw new BadRequestError(
        `Cannot terminate contractor when job is "${job.status}". ` +
          `Termination is only allowed for assigned or in-progress jobs.`
      );
    }

    if (!job.contractor_id) {
      throw new BadRequestError('No contractor assigned to this job');
    }

    const contractorId = job.contractor_id;

    // Validate state machine transition back to posted
    validateStatusTransition(
      job.status as JobStatus,
      JOB_STATUS.POSTED as JobStatus
    );

    // Handle escrow refund if payment is held
    let escrowRefunded = false;
    const { data: escrow } = await serverSupabase
      .from('escrow_transactions')
      .select('id, status, amount')
      .eq('job_id', jobId)
      .in('status', [
        ESCROW_STATUS.HELD,
        ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL,
      ])
      .limit(1)
      .single();

    if (escrow) {
      validateEscrowTransition(
        escrow.status as EscrowStatusValue,
        ESCROW_STATUS.REFUNDED as EscrowStatusValue
      );

      const { error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: ESCROW_STATUS.REFUNDED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrow.id);

      if (escrowError) {
        logger.error(
          'Failed to refund escrow during termination',
          escrowError,
          {
            service: 'jobs',
            jobId,
            escrowId: escrow.id,
          }
        );
        throw new BadRequestError(
          'Failed to process escrow refund. Please contact support.'
        );
      }

      escrowRefunded = true;
      logger.info('Escrow refunded due to contractor termination', {
        service: 'jobs',
        jobId,
        escrowId: escrow.id,
        amount: escrow.amount,
      });
    }

    // Cancel the active contract
    const { error: contractError } = await serverSupabase
      .from('contracts')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId)
      .in('status', [
        'draft',
        'pending_homeowner',
        'pending_contractor',
        'accepted',
      ]);

    if (contractError) {
      logger.error(
        'Failed to cancel contract during termination',
        contractError,
        {
          service: 'jobs',
          jobId,
        }
      );
    }

    // Reject all active bids from the terminated contractor
    await serverSupabase
      .from('bids')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .eq('status', 'accepted');

    // Reset job to posted status, clear contractor assignment
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        status: JOB_STATUS.POSTED,
        contractor_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      logger.error(
        'Failed to reset job status after termination',
        updateError,
        {
          service: 'jobs',
          jobId,
        }
      );
      throw new BadRequestError(
        'Failed to terminate contractor. Please try again.'
      );
    }

    // Notify both parties
    await notifyJobStatusChange({
      jobId,
      jobTitle: job.title || 'Job',
      oldStatus: job.status,
      newStatus: JOB_STATUS.POSTED,
      homeownerId: user.id,
      contractorId,
    });

    // Send specific termination notification to contractor
    try {
      await NotificationService.createNotification({
        userId: contractorId,
        title: 'Contractor Assignment Terminated',
        message: `Your assignment for "${job.title || 'a job'}" has been terminated by the homeowner. Reason: ${reason}`,
        type: 'job_terminated',
        actionUrl: `/contractor/jobs`,
      });
    } catch (notificationError) {
      logger.error(
        'Failed to send termination notification',
        notificationError,
        {
          service: 'jobs',
          jobId,
          contractorId,
        }
      );
    }

    logger.info('Contractor terminated from job', {
      service: 'jobs',
      jobId,
      homeownerId: user.id,
      contractorId,
      reason,
      escrowRefunded,
      previousStatus: job.status,
    });

    return NextResponse.json({
      success: true,
      message: 'Contractor terminated. Job is now open for new bids.',
      escrowRefunded,
    });
  }
);
