import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
import { reconcileRefundEvent } from './RefundService';

async function requireReview(escrowId: string): Promise<never> {
  const { error } = await serverSupabase.rpc('flag_escrow_refund_review', {
    p_escrow_id: escrowId,
  });
  if (error)
    throw new InternalServerError(
      'Refund reconciliation flag could not be persisted'
    );
  throw new ConflictError('Provider refund requires reconciliation');
}

/** Signature-verified charge events only. Never creates a provider refund. */
export async function reconcileLedgerRefundCharge(
  eventCharge: Stripe.Charge
): Promise<boolean> {
  const intentId =
    typeof eventCharge.payment_intent === 'string'
      ? eventCharge.payment_intent
      : eventCharge.payment_intent?.id;
  if (!intentId) return false;
  const { data: escrow, error: escrowError } = await serverSupabase
    .from('escrow_transactions')
    .select('id')
    .eq('payment_intent_id', intentId)
    .maybeSingle();
  if (escrowError) throw new InternalServerError('Refund escrow lookup failed');
  if (!escrow) return false;
  const { data: balance, error: balanceError } = await serverSupabase
    .from('escrow_refund_balances')
    .select('escrow_id,cash_minor,needs_review')
    .eq('escrow_id', escrow.id)
    .maybeSingle();
  if (balanceError)
    throw new InternalServerError('Refund balance lookup failed');
  if (!balance) return false;

  // Event charge totals and embedded refund lists are snapshots. Exhaust current
  // provider pagination and retrieve individual outcomes before recording them.
  let after: string | undefined;
  const refunds: Stripe.Refund[] = [];
  for (let page = 0; page < 10; page++) {
    const result = await stripeWithTimeout(
      () =>
        stripe.refunds.list({
          payment_intent: intentId,
          limit: 100,
          ...(after ? { starting_after: after } : {}),
        }),
      'list-webhook-refunds',
      10000
    );
    refunds.push(...result.data);
    if (!result.has_more) break;
    after = result.data.at(-1)?.id;
    if (!after || page === 9)
      throw new ConflictError('Refund history could not be exhausted');
  }
  // Do not let a legacy handler overwrite ledger state when provider money was
  // moved externally. Reconciliation must explicitly resolve this durable flag.
  if (
    refunds.some(
      (refund) =>
        !refund.metadata?.refundOperationId &&
        refund.status !== 'failed' &&
        refund.status !== 'canceled'
    )
  ) {
    return requireReview(escrow.id);
  }
  for (const refund of refunds) {
    if (refund.metadata?.refundOperationId) await reconcileRefundEvent(refund);
  }
  const current = await stripeWithTimeout(
    () => stripe.charges.retrieve(eventCharge.id),
    'retrieve-refunded-charge',
    10000
  );
  const currentIntent =
    typeof current.payment_intent === 'string'
      ? current.payment_intent
      : current.payment_intent?.id;
  if (
    currentIntent !== intentId ||
    current.currency !== 'gbp' ||
    current.amount !== balance.cash_minor
  ) {
    return requireReview(escrow.id);
  }
  const { data: recorded, error: recordedError } = await serverSupabase
    .from('escrow_refund_balances')
    .select('cash_refunded_minor,needs_review')
    .eq('escrow_id', escrow.id)
    .single();
  if (recordedError || !recorded)
    throw new InternalServerError('Refund totals could not be verified');
  if (
    recorded.needs_review ||
    current.amount_refunded !== recorded.cash_refunded_minor
  ) {
    // Another provider refund may have appeared between list and retrieve.
    // Retry using a fresh snapshot; never acknowledge contradictory totals.
    throw new ConflictError('Provider and recorded refund totals differ');
  }
  return true;
}

/** Refund events recover the operation even when the request process disappeared. */
export async function handleRefundChanged(
  eventRefund: Stripe.Refund
): Promise<void> {
  if (await reconcileRefundEvent(eventRefund)) return;
  const current = await stripeWithTimeout(
    () => stripe.refunds.retrieve(eventRefund.id),
    'retrieve-unmapped-refund',
    10000
  );
  const chargeId =
    typeof current.charge === 'string' ? current.charge : current.charge?.id;
  if (!chargeId) throw new ConflictError('Refund event has no charge');
  const charge = await stripeWithTimeout(
    () => stripe.charges.retrieve(chargeId),
    'retrieve-refund-charge',
    10000
  );
  await reconcileLedgerRefundCharge(charge);
}
