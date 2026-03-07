import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

const confirmIntentSchema = z.object({
  paymentIntentId: z.string().regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
  jobId: z.string().uuid('Invalid job ID'),
});

/**
 * POST /api/payments/confirm-intent
 * Confirm a Stripe payment intent and update escrow status
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, confirmIntentSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentIntentId, jobId } = validation.data;

    // Retrieve the payment intent from Stripe
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: error.message, type: error.type },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      logger.warn('Payment confirmation attempted for non-successful payment', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        status: paymentIntent.status
      });
      return NextResponse.json(
        {
          error: 'Payment not completed',
          status: paymentIntent.status,
          requiresAction: paymentIntent.status === 'requires_action',
        },
        { status: 400 }
      );
    }

    // Verify job and escrow transaction
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Unauthorized');
    }

    // Get current escrow transaction for optimistic locking
    const { data: currentEscrow, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, amount, status, stripe_payment_intent_id, payment_intent_id, version, created_at, updated_at')
      .eq('payment_intent_id', paymentIntentId)
      .eq('job_id', jobId)
      .single();

    if (fetchError || !currentEscrow) {
      logger.error('Escrow transaction not found', fetchError, {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId
      });
      return NextResponse.json(
        { error: 'Escrow transaction not found' },
        { status: 404 }
      );
    }

    // FIX CRIT-5: Webhook is the source of truth for escrow status.
    // If webhook already updated escrow to 'held', just confirm that.
    // If not yet updated, update here as a fallback (webhook may arrive later).
    let escrowTransaction = currentEscrow;

    if (currentEscrow.status === 'held') {
      // Webhook already processed — just return success
      logger.info('Escrow already held (webhook processed first)', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId,
      });
    } else if (currentEscrow.status === 'pending') {
      // Webhook hasn't arrived yet — update as fallback
      const { data: updatedEscrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'held',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', paymentIntentId)
        .eq('job_id', jobId)
        .eq('status', 'pending')
        .select()
        .single();

      if (escrowError || !updatedEscrow) {
        // Likely the webhook updated it between our read and write — re-fetch
        const { data: refetched } = await serverSupabase
          .from('escrow_transactions')
          .select('id, job_id, amount, status, stripe_payment_intent_id, payment_intent_id, version, created_at, updated_at')
          .eq('payment_intent_id', paymentIntentId)
          .eq('job_id', jobId)
          .single();

        if (refetched?.status === 'held') {
          escrowTransaction = refetched;
        } else {
          logger.error('Error confirming escrow transaction', escrowError, {
            service: 'payments',
            userId: user.id,
            paymentIntentId,
            jobId,
          });
          return NextResponse.json(
            { error: 'Failed to confirm payment. Please refresh the page.' },
            { status: 500 }
          );
        }
      } else {
        escrowTransaction = updatedEscrow;
      }
    } else {
      // Escrow is in an unexpected state (failed, cancelled, etc.)
      return NextResponse.json(
        { error: `Payment cannot be confirmed. Current status: ${currentEscrow.status}` },
        { status: 400 }
      );
    }

    logger.info('Payment confirmed and escrow updated', {
      service: 'payments',
      userId: user.id,
      paymentIntentId,
      jobId,
      escrowTransactionId: escrowTransaction.id,
      amount: escrowTransaction.amount
    });

    // Notify both parties about successful payment
    try {
      const amount = escrowTransaction.amount;
      const jobTitle = job.title || 'your job';
      const notificationPromises = [];

      if (job.contractor_id) {
        notificationPromises.push(
          NotificationService.createNotification({
            userId: job.contractor_id,
            title: 'Payment Secured in Escrow',
            message: `Payment of £${Number(amount).toLocaleString()} for "${jobTitle}" has been secured in escrow. You can now start work.`,
            type: 'payment',
            actionUrl: `/contractor/jobs/${jobId}`,
          })
        );
      }

      notificationPromises.push(
        NotificationService.createNotification({
          userId: user.id,
          title: 'Payment Confirmed',
          message: `Your payment of £${Number(amount).toLocaleString()} for "${jobTitle}" is now held securely in escrow until the job is completed.`,
          type: 'payment',
          actionUrl: `/jobs/${jobId}`,
        })
      );

      await Promise.all(notificationPromises);
    } catch (notifError) {
      logger.error('Failed to create payment confirmation notifications', notifError, { service: 'payments', jobId });
    }

    // NOTE: Job status is NOT updated here. Per the canonical workflow (Phase 6),
    // the contractor must upload before-photos and click "Start Job" via POST /api/jobs/[id]/start
    // which transitions the job from 'assigned' to 'in_progress'. Payment confirmation
    // only moves escrow to 'held' — the job remains 'assigned' until work begins.

    return NextResponse.json({
      success: true,
      escrowTransactionId: escrowTransaction.id,
      status: escrowTransaction.status,
      amount: escrowTransaction.amount,
    });
  }
);
