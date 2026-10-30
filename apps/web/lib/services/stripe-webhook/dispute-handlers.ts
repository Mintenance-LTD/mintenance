import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { OperatorAlertService } from '@/lib/services/admin/OperatorAlertService';
import type { SendNotificationFn } from './webhook-helpers';

/** Refresh provider state: Stripe does not guarantee webhook delivery order. */
async function syncDispute(delivered: Stripe.Dispute): Promise<void> {
  const current = await stripeWithTimeout(
    () => stripe.disputes.retrieve(delivered.id),
    'retrieve-chargeback',
    10000,
    0
  );
  if (current.id !== delivered.id || current.livemode !== delivered.livemode) {
    throw new Error('Provider dispute identity does not match the event');
  }
  const { data, error } = await serverSupabase.rpc(
    'sync_stripe_payment_dispute',
    {
      p_dispute: {
        id: current.id,
        payment_intent:
          typeof current.payment_intent === 'string'
            ? current.payment_intent
            : (current.payment_intent?.id ?? null),
        charge:
          typeof current.charge === 'string'
            ? current.charge
            : (current.charge?.id ?? null),
        amount: current.amount,
        currency: current.currency,
        status: current.status,
        reason: current.reason,
        evidence_due_by: current.evidence_details?.due_by ?? null,
      },
    }
  );
  if (error || !data || typeof data.status !== 'string') {
    throw new Error('Failed to persist provider dispute and payment hold');
  }
  // Canonical dispute insertion queues participant notifications and an admin
  // task in the same transaction. The independent operator outbox covers
  // unmatched charges and outcomes requiring reconciliation too.
  if (data.requiresReview || !['won', 'warning_closed'].includes(data.status)) {
    await OperatorAlertService.enqueue('stripe-chargeback-review', null);
  }
}

export async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  _notify: SendNotificationFn
): Promise<void> {
  await syncDispute(dispute);
}
export async function handleDisputeUpdated(
  dispute: Stripe.Dispute,
  _notify: SendNotificationFn
): Promise<void> {
  await syncDispute(dispute);
}
export async function handleDisputeClosed(
  dispute: Stripe.Dispute,
  _notify: SendNotificationFn
): Promise<void> {
  await syncDispute(dispute);
}
