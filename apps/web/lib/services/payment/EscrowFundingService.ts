import { getEscrowCashRequirement } from './PaymentFundingService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { ConflictError } from '@/lib/errors/api-error';

/** Verify captured provider funds independently of the client-writable legacy escrow state. */
export async function verifyEscrowFunding(
  escrowId: string,
  deadlineAt?: number
): Promise<string> {
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
  const remaining =
    deadlineAt === undefined ? 10000 : Math.min(10000, deadlineAt - Date.now());
  if (remaining <= 0)
    throw new ConflictError('Funding verification time budget exhausted');
  const intent = await stripeWithTimeout(
    () =>
      stripe.paymentIntents.retrieve(escrow.payment_intent_id, {
        expand: ['latest_charge'],
      }),
    'verify-escrow-funding',
    remaining,
    0
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
  let refundedMinor = 0;
  if (charge && (charge.amount_refunded !== 0 || charge.refunded)) {
    const { data: balance, error: balanceError } = await serverSupabase
      .from('escrow_refund_balances')
      .select(
        'gross_minor,cash_minor,credit_minor,cash_refunded_minor,credit_returned_minor,remaining_minor,needs_review'
      )
      .eq('escrow_id', escrowId)
      .maybeSingle();
    if (
      balanceError ||
      !balance ||
      balance.needs_review ||
      balance.gross_minor !== grossMinor ||
      balance.cash_minor !== expectedMinor ||
      balance.credit_minor !== grossMinor - expectedMinor ||
      !Number.isSafeInteger(balance.cash_refunded_minor) ||
      balance.cash_refunded_minor < 0 ||
      balance.cash_refunded_minor > expectedMinor ||
      !Number.isSafeInteger(balance.credit_returned_minor) ||
      balance.credit_returned_minor < 0 ||
      balance.credit_returned_minor > balance.credit_minor ||
      balance.remaining_minor !==
        grossMinor -
          balance.cash_refunded_minor -
          balance.credit_returned_minor ||
      balance.remaining_minor <= 0
    ) {
      throw new ConflictError('Refunded escrow funds require reconciliation');
    }
    refundedMinor = balance.cash_refunded_minor;
  }
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
    charge.refunded !== (refundedMinor === expectedMinor) ||
    charge.amount_refunded !== refundedMinor ||
    charge.currency !== 'gbp' ||
    charge.amount !== expectedMinor
  ) {
    throw new ConflictError(
      'Captured escrow funds do not match this job; reconciliation is required'
    );
  }
  return charge.id;
}
