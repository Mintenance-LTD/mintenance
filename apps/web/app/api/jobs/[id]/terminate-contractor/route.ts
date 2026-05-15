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
import { stripe } from '@/lib/stripe';
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

    // Handle escrow refund if payment is held.
    //
    // 2026-05-13 funds-stuck audit: this block previously flipped
    // `escrow.status` to `refunded` in the DB without ever calling
    // `stripe.refunds.create()`. The homeowner's card had been
    // charged when escrow was funded (via `/api/payments/create-intent`),
    // so the platform held real money but the DB said "refunded" —
    // the homeowner never saw the funds back. Two independent code
    // paths actually issue Stripe refunds (`/api/payments/refund` and
    // `/api/admin/refunds/[id]`); terminate-contractor was silently
    // not one of them.
    //
    // The fix: issue the Stripe refund first (with idempotency key so
    // a retry is safe), then flip the DB status and persist the
    // refund id on the escrow metadata. A Stripe failure aborts the
    // termination so the contractor's assignment stays intact —
    // safer than the previous "DB says refunded, money isn't moving"
    // posture.
    let escrowRefunded = false;
    const { data: escrow } = await serverSupabase
      .from('escrow_transactions')
      .select('id, status, amount, payment_intent_id, metadata')
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

      if (!escrow.payment_intent_id) {
        logger.error(
          'Cannot Stripe-refund escrow without payment_intent_id',
          new Error('Missing payment_intent_id on held escrow'),
          {
            service: 'jobs',
            jobId,
            escrowId: escrow.id,
          }
        );
        throw new BadRequestError(
          'Cannot process refund: escrow is missing its Stripe link. Please contact support.'
        );
      }

      let stripeRefundId: string | null = null;
      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: escrow.payment_intent_id,
            // amount omitted → full refund of the captured charge.
            reason: 'requested_by_customer',
            metadata: {
              jobId,
              escrowId: escrow.id,
              homeownerId: user.id,
              terminatedContractorId: contractorId,
              source: 'terminate-contractor',
            },
          },
          {
            // Same key on retry → Stripe returns the existing refund
            // rather than creating a second one.
            idempotencyKey: `terminate_refund_${escrow.id}`,
          }
        );
        stripeRefundId = refund.id;
        logger.info('Stripe refund issued for terminated job', {
          service: 'jobs',
          jobId,
          escrowId: escrow.id,
          refundId: stripeRefundId,
          amount: escrow.amount,
        });
      } catch (stripeErr) {
        logger.error('Stripe refund failed during termination', stripeErr, {
          service: 'jobs',
          jobId,
          escrowId: escrow.id,
          paymentIntentId: escrow.payment_intent_id,
        });
        throw new BadRequestError(
          'Failed to refund payment. Please try again, or contact support if the issue persists.'
        );
      }

      const existingMetadata =
        typeof escrow.metadata === 'object' && escrow.metadata
          ? escrow.metadata
          : {};

      const { error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: ESCROW_STATUS.REFUNDED,
          refunded_at: new Date().toISOString(),
          release_reason: 'terminate_contractor',
          metadata: {
            ...existingMetadata,
            stripe_refund_id: stripeRefundId,
            refunded_via: 'terminate-contractor',
            refunded_reason_text: reason,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrow.id);

      if (escrowError) {
        // Stripe refund already succeeded — DB is now drifted. Log
        // loudly so reconciliation catches it.
        logger.error(
          'CRITICAL: Stripe refund succeeded but escrow DB update failed',
          escrowError,
          {
            service: 'jobs',
            jobId,
            escrowId: escrow.id,
            stripeRefundId,
          }
        );
        throw new BadRequestError(
          'Refund was issued but the platform record is out of sync. Please contact support.'
        );
      }

      escrowRefunded = true;
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
