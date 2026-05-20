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

    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`
      )
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update refunded payment status', escrowError, {
        service: 'stripe-webhook',
        paymentIntentId,
      });
    }

    const jobId = escrowTransaction?.job_id || charge.metadata?.jobId;
    if (jobId) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    // Record in refunds table
    const refundAmount = charge.amount_refunded;
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
    if (escrowTransaction) {
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

    // Update escrow to failed
    const { data: escrowTransaction } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`
      )
      .select()
      .single();

    const homeownerId =
      escrowTransaction?.payer_id || charge.metadata?.homeownerId;
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
