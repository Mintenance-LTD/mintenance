import { getEscrowCashRequirement } from './PaymentFundingService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { ConflictError } from '@/lib/errors/api-error';

/** Verify captured provider funds independently of the client-writable legacy escrow state. */
export async function verifyEscrowFunding(escrowId: string): Promise<string> {
  const { data: escrow, error } = await serverSupabase
    .from('escrow_transactions')
    .select('job_id, payer_id, payee_id, amount, payment_intent_id')
    .eq('id', escrowId)
    .single();
  if (
    error ||
    !escrow?.payment_intent_id ||
    !escrow.payer_id ||
    !escrow.payee_id ||
    !escrow.job_id
  ) {
    throw new ConflictError('Escrow funding could not be verified');
  }
  const grossMinor = Math.round(Number(escrow.amount) * 100);
  if (!Number.isSafeInteger(grossMinor) || grossMinor <= 0) {
    throw new ConflictError('Escrow funding amount is invalid');
  }
  const intent = await stripeWithTimeout(
    () =>
      stripe.paymentIntents.retrieve(escrow.payment_intent_id, {
        expand: ['latest_charge'],
      }),
    'verify-escrow-funding',
    10000
  );
  const metadata = intent.metadata;
  const expectedMinor = await getEscrowCashRequirement(
    escrowId,
    Number(escrow.amount),
    escrow.payment_intent_id,
    metadata
  );
  const charge =
    typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  if (
    intent.status !== 'succeeded' ||
    intent.currency !== 'gbp' ||
    intent.amount_received !== expectedMinor ||
    (metadata.jobId ?? metadata.job_id) !== escrow.job_id ||
    (metadata.payerId ?? metadata.payer_id) !== escrow.payer_id ||
    (metadata.contractorId ?? metadata.contractor_id) !== escrow.payee_id ||
    !charge ||
    !charge.paid ||
    !charge.captured ||
    charge.disputed ||
    charge.refunded ||
    charge.amount_refunded !== 0 ||
    charge.currency !== 'gbp' ||
    charge.amount !== expectedMinor
  ) {
    throw new ConflictError(
      'Captured escrow funds do not match this job; reconciliation is required'
    );
  }
  return charge.id;
}
