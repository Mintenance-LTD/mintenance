/**
 * Charge-event webhook handlers.
 *
 * Extracted from `payment-handlers.ts` (2026-05-13) so the file
 * splits along the existing per-event boundary used elsewhere in
 * `stripe-webhook/`.
 *
 *   - charge.refunded         → handleChargeRefunded
 *   - charge.succeeded        → handleChargeSucceeded (audit log only —
 *                               escrow flips on payment_intent.succeeded)
 *   - charge.failed           → handleChargeFailed
 *
 * Note: charge.dispute.* events are in dispute-handlers.ts (already
 * separated).
 */

import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SendNotificationFn } from './webhook-helpers';
import {
  lookupEscrowForTerminalEvent,
  PRE_MONEY_STATUSES,
} from './payment-intent-handlers';

/**
 * Charge refunded — mark escrow as refunded, update job, record refund, notify users.
 */
export async function handleChargeRefunded(
  charge: Stripe.Charge,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Charge refunded webhook received', {
    service: 'stripe-webhook',
    chargeId: charge.id,
  });

  try {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      logger.warn('Charge has no payment intent', {
        service: 'stripe-webhook',
        chargeId: charge.id,
      });
      return;
    }

    const { data: existingEscrow, error: escrowLookupError } =
      await serverSupabase
      .from('escrow_transactions')
      .select(
        'id, job_id, payer_id, payee_id, amount, status, payment_intent_id'
      )
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (escrowLookupError || !existingEscrow) {
      logger.error('Failed to load escrow for refunded payment', escrowLookupError, {
        service: 'stripe-webhook',
        paymentIntentId,
      });
      return;
    }

    const escrowAmountCents = Math.round(Number(existingEscrow.amount) * 100);
    const refundAmount = charge.amount_refunded;
    const isValidRefund =
      charge.currency.toLowerCase() === 'gbp' &&
      Number.isInteger(refundAmount) &&
      refundAmount > 0 &&
      Number.isFinite(escrowAmountCents) &&
      escrowAmountCents > 0 &&
      refundAmount <= escrowAmountCents;

    if (!isValidRefund) {
      logger.error('Ignoring refund webhook with invalid escrow invariant', undefined, {
        service: 'stripe-webhook',
        paymentIntentId,
        chargeId: charge.id,
        refundAmount,
        escrowAmountCents,
        currency: charge.currency,
      });
      return;
    }

    // `amount_refunded` is cumulative on a Charge. A partial refund must not
    // make the whole escrow terminal or mark the job fully refunded.
    const isFullRefund = refundAmount === escrowAmountCents;
    const alreadyRefunded = existingEscrow.status === 'refunded';
    const refundableStatuses = [
      'pending',
      'held',
      'release_pending',
      'pending_review',
      'awaiting_homeowner_approval',
    ];
    let escrowTransaction = existingEscrow;

    if (isFullRefund && !alreadyRefunded) {
      const { data: updatedEscrow, error: escrowError } =
        await serverSupabase
          .from('escrow_transactions')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEscrow.id)
          .in('status', refundableStatuses)
          .select(
            'id, job_id, payer_id, payee_id, amount, status, payment_intent_id'
          )
          .maybeSingle();

      if (escrowError || !updatedEscrow) {
        logger.error('Failed to finalize refunded payment status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId,
          escrowId: existingEscrow.id,
          currentStatus: existingEscrow.status,
        });
        return;
      }
      escrowTransaction = updatedEscrow;
    } else if (!isFullRefund) {
      logger.info('Partial refund recorded without closing escrow', {
        service: 'stripe-webhook',
        paymentIntentId,
        chargeId: charge.id,
        escrowId: existingEscrow.id,
        amountRefunded: refundAmount,
        escrowAmountCents,
      });
    } else if (!refundableStatuses.includes(existingEscrow.status) && !alreadyRefunded) {
      logger.error('Ignoring refund for escrow outside refundable state', undefined, {
        service: 'stripe-webhook',
        paymentIntentId,
        escrowId: existingEscrow.id,
        currentStatus: existingEscrow.status,
      });
      return;
    }

    const jobId = escrowTransaction?.job_id || charge.metadata?.jobId;
    if (jobId && isFullRefund && !alreadyRefunded) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    // Record in refunds table
    try {
      await serverSupabase.from('refunds').upsert(
        {
          charge_id: charge.id,
          payment_intent_id: paymentIntentId,
          amount: refundAmount,
          currency: charge.currency,
          status: 'succeeded',
          reason: charge.metadata?.refundReason || 'webhook_refund',
          escrow_transaction_id: escrowTransaction?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'charge_id' }
      );
    } catch (refundRecordError) {
      logger.error('Failed to record refund', refundRecordError, {
        service: 'stripe-webhook',
        chargeId: charge.id,
      });
    }

    // Notify both homeowner and contractor
    if (escrowTransaction && !alreadyRefunded) {
      const amountStr = `£${(refundAmount / 100).toFixed(2)}`;
      if (escrowTransaction.payer_id) {
        await sendNotification(
          escrowTransaction.payer_id,
          'Refund Processed',
          `Your refund of ${amountStr} has been processed and will appear on your statement within 5-10 business days.`,
          'refund_processed'
        );
      }
      if (escrowTransaction.payee_id) {
        await sendNotification(
          escrowTransaction.payee_id,
          'Payment Refunded',
          `A payment of ${amountStr} for this job has been refunded to the homeowner.`,
          'payment_refunded'
        );
      }
    }

    logger.info('Payment marked as refunded', {
      service: 'stripe-webhook',
      paymentIntentId,
      chargeId: charge.id,
      amountRefunded: refundAmount,
    });
  } catch (error) {
    logger.error('Error in handleChargeRefunded', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Charge succeeded — log for audit trail. Escrow update is handled by payment_intent.succeeded.
 */
export async function handleChargeSucceeded(
  charge: Stripe.Charge,
  _sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Charge succeeded webhook received', {
    service: 'stripe-webhook',
    chargeId: charge.id,
    paymentIntentId: charge.payment_intent,
    amount: charge.amount,
  });
}

/**
 * Charge failed — update escrow status and notify homeowner.
 */
export async function handleChargeFailed(
  charge: Stripe.Charge,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Charge failed webhook received', {
    service: 'stripe-webhook',
    chargeId: charge.id,
    failureCode: charge.failure_code,
    failureMessage: charge.failure_message,
  });

  try {
    const paymentIntentId = charge.payment_intent as string;
    if (!paymentIntentId) return;

    // Out-of-order guard (audit 2026-07-27): a late/replayed charge.failed
    // must not rewrite an escrow that already progressed past pending.
    const existing = await lookupEscrowForTerminalEvent(
      paymentIntentId,
      'charge.failed'
    );
    if (existing === 'blocked') return;

    let escrowTransaction: { payer_id: string | null } | null = null;
    if (existing) {
      const { data: updated } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .in('status', PRE_MONEY_STATUSES)
        .select()
        .single();
      escrowTransaction = updated ?? existing;
    }

    const homeownerId =
      escrowTransaction?.payer_id ||
      charge.metadata?.payerId ||
      charge.metadata?.homeownerId;
    if (homeownerId) {
      const reason = charge.failure_message || 'Your card was declined';
      await sendNotification(
        homeownerId,
        'Payment Failed',
        `${reason}. Please try again with a different payment method.`,
        'payment_failed'
      );
    }

    logger.info('Charge failure processed', {
      service: 'stripe-webhook',
      chargeId: charge.id,
      failureCode: charge.failure_code,
    });
  } catch (error) {
    logger.error('Error in handleChargeFailed', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}
