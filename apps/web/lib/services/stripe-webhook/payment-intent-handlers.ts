/**
 * PaymentIntent webhook handlers.
 *
 * Extracted from `payment-handlers.ts` (2026-05-13) so the file
 * splits along the existing per-event boundary used elsewhere in
 * `stripe-webhook/`.
 *
 *   - payment_intent.succeeded         → handlePaymentIntentSucceeded
 *                                        (short-circuits to tip handler
 *                                        when metadata.type === 'job_tip')
 *   - payment_intent.payment_failed    → handlePaymentIntentFailed
 *   - payment_intent.canceled          → handlePaymentIntentCanceled
 *   - payment_intent.requires_action   → handlePaymentIntentRequiresAction
 */

import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID, type SendNotificationFn } from './webhook-helpers';
import { handleTipPaymentSucceeded } from './tip-payment-handler';
import { reconcileInvoicePayment } from './invoice-payment-reconciliation';

/**
 * Out-of-order guard (audit 2026-07-27): payment_intent.payment_failed /
 * payment_intent.canceled may be delivered late or replayed by Stripe. Once an
 * escrow has progressed to 'held' or beyond, a stale failure/cancellation
 * event must NOT rewrite it — previously these handlers updated by
 * payment_intent_id unconditionally, so a delayed `canceled` could flip a
 * funded (or even released) escrow into 'canceled', silently detaching real
 * money from its state machine. Only pre-money states may transition.
 * (handlePaymentIntentSucceeded has carried the mirror-image guard —
 * TERMINAL_OR_RELEASING — since earlier.)
 */
export const PRE_MONEY_STATUSES = [
  'pending',
  'failed',
  'canceled',
  'cancelled',
];

/**
 * Look up the escrow for a payment intent and decide whether a
 * failure/cancellation event may apply. Returns the row when the transition
 * is allowed, null when there is no row, and 'blocked' when the row exists
 * but has progressed past a pre-money state.
 */
export async function lookupEscrowForTerminalEvent(
  paymentIntentId: string,
  eventLabel: string
): Promise<
  | { id: string; job_id: string | null; payer_id: string | null }
  | null
  | 'error'
  | 'blocked'
> {
  const { data: existing, error } = await serverSupabase
    .from('escrow_transactions')
    .select('id, job_id, payer_id, status')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to look up escrow transaction', error, {
      service: 'stripe-webhook',
      paymentIntentId,
      event: eventLabel,
    });
    // A lookup failure is distinct from a missing escrow. Callers must not
    // fall back to metadata-driven mutations while the authoritative state
    // is unknown.
    return 'error';
  }
  if (!existing) return null;
  if (!PRE_MONEY_STATUSES.includes(existing.status)) {
    logger.warn(
      `Ignoring ${eventLabel} for escrow already past pending (out-of-order guard)`,
      {
        service: 'stripe-webhook',
        paymentIntentId,
        escrowId: existing.id,
        currentStatus: existing.status,
      }
    );
    return 'blocked';
  }
  return existing;
}

/**
 * Payment succeeded — mark escrow as held, update job payment status.
 *
 * If the PaymentIntent metadata marks this as a `job_tip`, we
 * short-circuit to the tip handler (tips don't have an escrow row).
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment succeeded webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  // Tip-jar short-circuit — no escrow row to look up.
  if (paymentIntent.metadata?.type === 'job_tip') {
    await handleTipPaymentSucceeded(paymentIntent, sendNotification);
    return;
  }

  try {
    // Status guard: a late/duplicate/out-of-order payment_intent.succeeded
    // must NOT flip an escrow that has already progressed past 'held' back to
    // 'held' — that would re-open a released/completed escrow for a second
    // release. Look the row up first and bail on any post-held state.
    const { data: existing, error: lookupError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, status, amount')
      .eq('payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (lookupError) {
      logger.error('Failed to look up escrow transaction', lookupError, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    if (!existing) {
      logger.warn('No escrow transaction found for payment intent', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    const escrowAmountCents = Math.round(Number(existing.amount) * 100);
    if (
      paymentIntent.currency.toLowerCase() !== 'gbp' ||
      !Number.isFinite(escrowAmountCents) ||
      paymentIntent.amount !== escrowAmountCents
    ) {
      logger.error('PaymentIntent does not match GBP escrow invariant', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
        escrowId: existing.id,
        paymentCurrency: paymentIntent.currency,
        paymentAmountCents: paymentIntent.amount,
        escrowAmountCents,
      });
      return;
    }

    const TERMINAL_OR_RELEASING = [
      'release_pending',
      'released',
      'completed',
      'refunded',
      'disputed',
    ];
    if (TERMINAL_OR_RELEASING.includes(existing.status)) {
      logger.warn(
        'Ignoring payment_intent.succeeded for escrow already past held',
        {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
          escrowId: existing.id,
          currentStatus: existing.status,
        }
      );
      return;
    }

    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update escrow transaction', escrowError, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      throw new Error('Failed to persist funded escrow transaction');
    }

    if (!escrowTransaction) {
      logger.warn('No escrow transaction found for payment intent', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      throw new Error('Escrow transaction missing for successful payment');
    }

    await reconcileInvoicePayment(paymentIntent);

    // Backfill payer/payee IDs if missing (with UUID validation)
    if (!escrowTransaction.payer_id || !escrowTransaction.payee_id) {
      // `payerId` is the actual funding account for delegated landlord /
      // manager jobs. Keep `homeownerId` as the legacy fallback for older
      // PaymentIntents that predate delegated-payer metadata.
      const payerId =
        paymentIntent.metadata?.payerId || paymentIntent.metadata?.homeownerId;
      const payerMetadataKey = paymentIntent.metadata?.payerId
        ? 'payerId'
        : 'homeownerId';
      const contractorId = paymentIntent.metadata?.contractorId;

      const validPayer = payerId && isValidUUID(payerId);
      const validContractor = contractorId && isValidUUID(contractorId);

      if (!validPayer && payerId) {
        logger.warn(`Invalid ${payerMetadataKey} UUID in payment metadata`, {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
          ...(payerMetadataKey === 'payerId'
            ? { payerId }
            : { homeownerId: payerId }),
        });
      }
      if (!validContractor && contractorId) {
        logger.warn('Invalid contractorId UUID in payment metadata', {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
          contractorId,
        });
      }

      if (validPayer && validContractor) {
        const { error: participantUpdateError } = await serverSupabase
          .from('escrow_transactions')
          .update({
            payer_id: payerId,
            payee_id: contractorId,
          })
          .eq('id', escrowTransaction.id);

        if (participantUpdateError) {
          logger.error(
            'Failed to backfill escrow participants from payment metadata',
            participantUpdateError,
            {
              service: 'stripe-webhook',
              paymentIntentId: paymentIntent.id,
              escrowId: escrowTransaction.id,
            }
          );
          throw new Error('Failed to persist escrow participants');
        }

        logger.info('Backfilled payer_id and payee_id for escrow transaction', {
          service: 'stripe-webhook',
          escrowId: escrowTransaction.id,
          payerId,
          contractorId,
        });
      }
    }

    logger.info('Escrow transaction updated to held', {
      service: 'stripe-webhook',
      escrowId: escrowTransaction.id,
    });

    const { error: jobError } = await serverSupabase
      .from('jobs')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransaction.job_id);

    if (jobError) {
      logger.error('Failed to update job payment status', jobError, {
        service: 'stripe-webhook',
        jobId: escrowTransaction.job_id,
      });
      throw new Error('Failed to persist job payment status');
    }

    // R6 #5 deferred: tell every stakeholder the job is funded. This is
    // where the 'payment_secured' canonical event fires — homeowner,
    // payer (landlord), contractor, and tenants (on rental properties)
    // all learn escrow is held and work can start.
    try {
      const { notifyStakeholders } =
        await import('@/lib/services/notifications/JobStakeholderNotifier');
      const jobIdForFanout = escrowTransaction.job_id as string;
      await notifyStakeholders({
        jobId: jobIdForFanout,
        type: 'payment_secured',
        titleFor: (role) =>
          role === 'contractor'
            ? 'Payment secured — you can start'
            : role === 'tenant'
              ? 'Your repair is funded'
              : 'Payment secured in escrow',
        messageFor: (role) => {
          if (role === 'contractor')
            return 'The homeowner has funded this job. Payment is held in escrow until you complete the work.';
          if (role === 'tenant')
            return 'The contractor can now schedule a visit. You’ll get another update when they start on site.';
          if (role === 'payer')
            return 'Your payment has been secured in escrow and will be released once the work is approved.';
          return 'Your payment has been secured in escrow and will be released after you approve the completed work.';
        },
        actionUrlFor: () => `/jobs/${jobIdForFanout}`,
        emailTenants: true,
        tenantJobStatus: 'assigned',
      });
    } catch (fanoutErr) {
      logger.warn('Stakeholder fan-out on payment secured failed', {
        service: 'stripe-webhook',
        jobId: escrowTransaction.job_id,
        err: fanoutErr instanceof Error ? fanoutErr.message : String(fanoutErr),
      });
    }
  } catch (error) {
    logger.error('Error in handlePaymentIntentSucceeded', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Payment failed — mark escrow as failed, update job, notify homeowner.
 */
export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment failed webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  try {
    const existing = await lookupEscrowForTerminalEvent(
      paymentIntent.id,
      'payment_intent.payment_failed'
    );
    if (existing === 'blocked' || existing === 'error') return;

    let escrowTransaction: {
      id: string;
      job_id: string | null;
      payer_id: string | null;
    } | null = null;
    if (existing) {
      const { data: updated, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        // Re-assert the guard at write time so a concurrent
        // payment_intent.succeeded can't interleave between lookup and update.
        .in('status', PRE_MONEY_STATUSES)
        .select()
        .single();

      if (escrowError) {
        logger.error(
          'Failed to update escrow transaction status',
          escrowError,
          {
            service: 'stripe-webhook',
            paymentIntentId: paymentIntent.id,
          }
        );
      }
      escrowTransaction = updated ?? existing;
    }

    const jobId = escrowTransaction?.job_id || paymentIntent.metadata?.jobId;
    if (jobId) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      const homeownerId =
        escrowTransaction?.payer_id ||
        paymentIntent.metadata?.payerId ||
        paymentIntent.metadata?.homeownerId;
      if (homeownerId) {
        await sendNotification(
          homeownerId,
          'Payment Failed',
          'Your payment could not be processed. Please try again or use a different payment method.',
          'payment_failed'
        );
      }
    }

    logger.info('Payment marked as failed', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      jobId,
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentFailed', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Payment cancelled — mark escrow as cancelled, update job.
 */
export async function handlePaymentIntentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  _sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment canceled webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  try {
    const existing = await lookupEscrowForTerminalEvent(
      paymentIntent.id,
      'payment_intent.canceled'
    );
    if (existing === 'blocked' || existing === 'error') return;

    let escrowTransaction: { id: string; job_id: string | null } | null = null;
    if (existing) {
      const { data: updated, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .in('status', PRE_MONEY_STATUSES)
        .select()
        .single();

      if (escrowError) {
        logger.error('Failed to update canceled payment status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
        });
      }
      escrowTransaction = updated ?? existing;
    }

    const jobId = escrowTransaction?.job_id || paymentIntent.metadata?.jobId;
    if (jobId) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    logger.info('Payment marked as canceled', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentCanceled', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Payment requires 3D Secure or other action — notify homeowner to complete authentication.
 */
export async function handlePaymentIntentRequiresAction(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment requires action webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  try {
    const homeownerId =
      paymentIntent.metadata?.payerId || paymentIntent.metadata?.homeownerId;
    const jobId = paymentIntent.metadata?.jobId;

    if (homeownerId) {
      await sendNotification(
        homeownerId,
        'Payment Requires Action',
        'Your payment requires additional verification (3D Secure). Please return to the payment page to complete authentication.',
        'payment_requires_action'
      );
    }

    logger.info('Payment requires_action notification sent', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      homeownerId,
      jobId,
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentRequiresAction', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}
