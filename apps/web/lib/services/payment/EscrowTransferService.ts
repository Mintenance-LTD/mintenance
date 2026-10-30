import { verifyEscrowFunding } from './EscrowFundingService';
import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { InternalServerError } from '@/lib/errors/api-error';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';

/** One provider operation per escrow, shared by manual and automatic release. */
export async function createEscrowTransfer(
  escrowId: string,
  amountMinor: number,
  destination: string,
  deadlineAt?: number
): Promise<{ id: string }> {
  const providerCall = <T>(operation: () => Promise<T>, label: string) => {
    const remaining =
      deadlineAt === undefined
        ? 10000
        : Math.min(10000, deadlineAt - Date.now());
    if (remaining <= 0)
      throw new InternalServerError('Transfer recovery time budget exhausted');
    return stripeWithTimeout(operation, label, remaining, 0);
  };
  const { data, error } = await serverSupabase.rpc('reserve_escrow_transfer', {
    p_escrow_id: escrowId,
    p_amount: amountMinor,
    p_destination: destination,
  });
  const attempt = Array.isArray(data) ? data[0] : data;
  if (error || !attempt)
    throw new InternalServerError('Unable to reserve the payment transfer');
  if (attempt.transfer_id) {
    const existing = await providerCall(
      () => stripe.transfers.retrieve(attempt.transfer_id),
      'recover-escrow-transfer'
    );
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
  const created = Date.parse(
    attempt.provider_attempt_started_at ?? attempt.created_at
  );
  if (!Number.isFinite(created) || Date.now() - created > 23 * 60 * 60 * 1000) {
    throw new InternalServerError('Payment transfer requires reconciliation');
  }
  await verifyEscrowFunding(escrowId, deadlineAt);
  let transfer: Stripe.Transfer;
  try {
    transfer = await providerCall(
      () =>
        stripe.transfers.create(
          attempt.stripe_parameters as Stripe.TransferCreateParams,
          { idempotencyKey: attempt.idempotency_key }
        ),
      'create-escrow-transfer'
    );
  } catch (providerError: unknown) {
    // Stripe caches an insufficient-balance rejection under its idempotency
    // key. Reusing that key after funds arrive repeats the rejection forever.
    // Only this definitive no-transfer response can retire a key. Timeouts,
    // connection errors, 5xx responses and unknown outcomes retain it.
    const rejection =
      providerError as Partial<Stripe.errors.StripeError> | null;
    if (
      rejection?.type === 'StripeInvalidRequestError' &&
      rejection.statusCode === 400 &&
      rejection.code === 'balance_insufficient' &&
      typeof rejection.requestId === 'string' &&
      /^req_[A-Za-z0-9]+$/.test(rejection.requestId)
    ) {
      const { error: rejectionError } = await serverSupabase.rpc(
        'record_escrow_transfer_balance_rejection',
        {
          p_escrow_id: escrowId,
          p_idempotency_key: attempt.idempotency_key,
          p_request_id: rejection.requestId,
        }
      );
      if (rejectionError)
        throw new InternalServerError(
          'Payment transfer requires reconciliation'
        );
    }
    throw providerError;
  }
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
