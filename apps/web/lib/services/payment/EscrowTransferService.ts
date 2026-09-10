import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { InternalServerError } from '@/lib/errors/api-error';

/** One provider operation per escrow, shared by manual and automatic release. */
export async function createEscrowTransfer(
  escrowId: string,
  amountMinor: number,
  destination: string
): Promise<{ id: string }> {
  const { data, error } = await serverSupabase.rpc('reserve_escrow_transfer', {
    p_escrow_id: escrowId,
    p_amount: amountMinor,
    p_destination: destination,
  });
  const attempt = Array.isArray(data) ? data[0] : data;
  if (error || !attempt)
    throw new InternalServerError('Unable to reserve the payment transfer');
  if (attempt.transfer_id) {
    const existing = await stripe.transfers.retrieve(attempt.transfer_id);
    if (
      existing.reversed ||
      existing.amount_reversed > 0 ||
      existing.amount !== amountMinor ||
      existing.currency !== 'gbp' ||
      existing.destination !== destination
    ) {
      throw new InternalServerError('Payment transfer requires reconciliation');
    }
    return { id: existing.id };
  }
  // Stripe may discard keys after 24h. An unresolved older operation must
  // be reconciled rather than risking a second transfer with an expired key.
  const created = Date.parse(attempt.created_at);
  if (!Number.isFinite(created) || Date.now() - created > 23 * 60 * 60 * 1000) {
    throw new InternalServerError('Payment transfer requires reconciliation');
  }
  const transfer = await stripe.transfers.create(
    attempt.stripe_parameters as Stripe.TransferCreateParams,
    { idempotencyKey: attempt.idempotency_key }
  );
  const { data: saved, error: saveError } = await serverSupabase
    .from('escrow_transfer_attempts')
    .update({
      transfer_id: transfer.id,
      completed_at: new Date().toISOString(),
    })
    .eq('escrow_id', escrowId)
    .is('transfer_id', null)
    .select('escrow_id');
  if (saveError || !saved?.length) {
    // Do not manufacture a success or reverse an already successful transfer.
    // Retry the same frozen provider request to recover a lost DB write.
    throw new InternalServerError(
      'Payment transfer is awaiting reconciliation'
    );
  }
  return { id: transfer.id };
}
