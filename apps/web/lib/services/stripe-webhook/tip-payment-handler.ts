/**
 * Tip-jar webhook handler.
 *
 * Extracted from `payment-handlers.ts` (2026-05-13) so the file
 * splits along the existing per-event boundary used elsewhere in
 * `stripe-webhook/` (subscription / invoice / checkout / dispute /
 * setup-intent / charge / payment-intent / tip).
 *
 * Tips are Direct Charge model — no escrow row to flip, no
 * platform fee to record. Only the `job_tips` row and the
 * contractor notification need handling.
 *
 * Caller: `handlePaymentIntentSucceeded` short-circuits to this
 * function when `paymentIntent.metadata.type === 'job_tip'`.
 */

import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SendNotificationFn } from './webhook-helpers';

export async function handleTipPaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  try {
    const jobId = paymentIntent.metadata?.job_id;
    const payerId = paymentIntent.metadata?.payer_id;
    const payeeId = paymentIntent.metadata?.payee_id;

    const { data: tip, error } = await serverSupabase
      .from('job_tips')
      .select('id, amount, currency, job_id, payer_id, payee_id, note, status')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (error || !tip) {
      logger.error('Failed to load job_tips row for completed payment', error, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    const expectedAmount = Math.round(Number(tip.amount) * 100);
    const metadataMatches =
      jobId === tip.job_id &&
      payerId === tip.payer_id &&
      payeeId === tip.payee_id;
    const paymentMatches =
      paymentIntent.currency.toLowerCase() === 'gbp' &&
      String(tip.currency).toLowerCase() === 'gbp' &&
      Number.isFinite(expectedAmount) &&
      expectedAmount > 0 &&
      paymentIntent.amount === expectedAmount;

    if (!metadataMatches || !paymentMatches) {
      logger.error('Ignoring job tip payment with mismatched invariants', undefined, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
        tipId: tip.id,
        metadataMatches,
        paymentMatches,
      });
      return;
    }

    if (tip.status === 'completed') {
      logger.info('Job tip payment already completed; ignoring replay', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
        tipId: tip.id,
      });
      return;
    }

    const { data: completedTip, error: updateError } = await serverSupabase
      .from('job_tips')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tip.id)
      .eq('status', 'pending')
      .select('id, amount, currency, job_id, payee_id, note')
      .maybeSingle();

    if (updateError) {
      logger.error('Failed to flip job_tips row to completed', updateError, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
        tipId: tip.id,
      });
      return;
    }

    // A concurrent webhook may have completed the row first. Only the
    // request that owns the pending -> completed transition sends a notice.
    if (!completedTip) {
      logger.info('Job tip completion was already handled concurrently', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
        tipId: tip.id,
      });
      return;
    }

    // Fire notification to the contractor. sendNotification is
    // positional `(userId, title, message, type, actionUrl?)` — see
    // webhook-helpers.ts. The actionUrl deep-links to the contractor's
    // job-detail view, where the ContractorTipsReceivedCard surfaces
    // total received + note (2026-05-13 commit bd7a238ec).
    try {
      const amountLabel = `£${Number(completedTip.amount).toFixed(2)}`;
      const title = `You received a ${amountLabel} tip 💚`;
      const message = completedTip.note
        ? `${amountLabel} tip on your completed job. Note: "${completedTip.note}"`
        : `${amountLabel} tip on your completed job — funds land in your next payout.`;
      // 2026-05-25 audit-45 P2: thread jobId + tipId so the mobile
      // routingTable case for 'job_tip_received' can deep-link to the
      // contractor's JobDetails (where TipsReceivedSection lives).
      // sendNotification merges extra metadata alongside its fixed
      // { source: 'stripe-webhook' } marker.
      await sendNotification(
        completedTip.payee_id,
        title,
        message,
        'job_tip_received',
        completedTip.job_id ? `/contractor/jobs/${completedTip.job_id}` : undefined,
        {
          ...(completedTip.job_id ? { jobId: completedTip.job_id } : {}),
          tipId: completedTip.id,
          amount: Number(completedTip.amount),
        }
      );
    } catch (notifyErr) {
      logger.error('Tip recorded but notification failed', notifyErr, {
        service: 'stripe-webhook',
        tipId: tip.id,
      });
    }

    logger.info('Job tip marked completed', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      tipId: completedTip.id,
      jobId,
      payerId,
      payeeId,
    });
  } catch (err) {
    logger.error('Error handling tip payment success', err, {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
    });
  }
}
