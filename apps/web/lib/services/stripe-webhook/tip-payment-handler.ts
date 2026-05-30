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
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select('id, amount, currency, job_id, payee_id, note')
      .single();

    if (error || !tip) {
      logger.error('Failed to flip job_tips row to completed', error, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    // Fire notification to the contractor. sendNotification is
    // positional `(userId, title, message, type, actionUrl?)` — see
    // webhook-helpers.ts. The actionUrl deep-links to the contractor's
    // job-detail view, where the ContractorTipsReceivedCard surfaces
    // total received + note (2026-05-13 commit bd7a238ec).
    try {
      const amountLabel = `£${Number(tip.amount).toFixed(2)}`;
      const title = `You received a ${amountLabel} tip 💚`;
      const message = tip.note
        ? `${amountLabel} tip on your completed job. Note: "${tip.note}"`
        : `${amountLabel} tip on your completed job — funds land in your next payout.`;
      // 2026-05-25 audit-45 P2: thread jobId + tipId so the mobile
      // routingTable case for 'job_tip_received' can deep-link to the
      // contractor's JobDetails (where TipsReceivedSection lives).
      // sendNotification merges extra metadata alongside its fixed
      // { source: 'stripe-webhook' } marker.
      await sendNotification(
        tip.payee_id,
        title,
        message,
        'job_tip_received',
        tip.job_id ? `/contractor/jobs/${tip.job_id}` : undefined,
        {
          ...(tip.job_id ? { jobId: tip.job_id } : {}),
          tipId: tip.id,
          amount: Number(tip.amount),
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
      tipId: tip.id,
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
