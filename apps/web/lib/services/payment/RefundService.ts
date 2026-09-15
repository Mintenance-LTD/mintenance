import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';

export interface RefundOperation {
  id: string;
  escrow_id: string;
  actor_id: string;
  initiated_by?: string | null;
  gross_minor: number;
  cash_minor: number;
  credit_minor: number;
  payment_intent_id: string;
  stripe_parameters: Stripe.RefundCreateParams;
  provider_refund_id: string | null;
  state:
    | 'reserved'
    | 'pending'
    | 'requires_action'
    | 'succeeded'
    | 'failed'
    | 'canceled'
    | 'reconciliation_required';
  created_at: string;
}

function operationFrom(data: unknown): RefundOperation {
  const row = (Array.isArray(data) ? data[0] : data) as
    | RefundOperation
    | undefined;
  if (
    !row?.id ||
    !row.escrow_id ||
    !row.actor_id ||
    !row.payment_intent_id ||
    !Number.isSafeInteger(row.gross_minor) ||
    row.gross_minor <= 0 ||
    !Number.isSafeInteger(row.cash_minor) ||
    row.cash_minor < 0 ||
    !Number.isSafeInteger(row.credit_minor) ||
    row.credit_minor < 0 ||
    ![
      'reserved',
      'pending',
      'requires_action',
      'succeeded',
      'failed',
      'canceled',
      'reconciliation_required',
    ].includes(row.state) ||
    row.cash_minor + row.credit_minor !== row.gross_minor
  ) {
    throw new InternalServerError('Refund operation could not be verified');
  }
  return row;
}

export async function reserveRefund(input: {
  actorId: string;
  jobId: string;
  escrowId: string;
  requestKey: string;
  grossMinor: number;
  reason: string;
}): Promise<RefundOperation> {
  const { data, error } = await serverSupabase.rpc('reserve_escrow_refund', {
    p_actor_id: input.actorId,
    p_job_id: input.jobId,
    p_escrow_id: input.escrowId,
    p_request_key: input.requestKey,
    p_gross_minor: input.grossMinor,
    p_reason: input.reason,
  });
  if (error)
    throw new ConflictError(
      'This refund cannot be reserved. Refresh its status before retrying.'
    );
  const op = operationFrom(data);
  if (
    op.escrow_id !== input.escrowId ||
    op.actor_id !== input.actorId ||
    op.gross_minor !== input.grossMinor
  ) {
    throw new ConflictError('Refund reservation does not match the request');
  }
  return op;
}

/** Admin authority is checked by the reservation RPC; money still belongs to the payer. */
export async function reserveAdminRefund(input: {
  adminId: string;
  payerId: string;
  jobId: string;
  escrowId: string;
  requestKey: string;
  grossMinor: number;
  reason: string;
}): Promise<RefundOperation> {
  const { data, error } = await serverSupabase.rpc(
    'reserve_admin_escrow_refund',
    {
      p_admin_id: input.adminId,
      p_job_id: input.jobId,
      p_escrow_id: input.escrowId,
      p_request_key: input.requestKey,
      p_gross_minor: input.grossMinor,
      p_reason: input.reason,
    }
  );
  if (error)
    throw new ConflictError(
      'Admin refund could not be reserved. Refresh its status before retrying.'
    );
  const op = operationFrom(data);
  if (
    op.initiated_by !== input.adminId ||
    op.actor_id !== input.payerId ||
    op.escrow_id !== input.escrowId ||
    op.gross_minor !== input.grossMinor
  ) {
    throw new ConflictError(
      'Admin refund reservation does not match the request'
    );
  }
  return op;
}

/** Route calls this after current ownership checks; reservation rechecks under lock. */
export async function readRefundContext(input: {
  escrowId: string;
  actorId: string;
  requestKey: string;
  originalAmount: number;
}): Promise<{ existing: RefundOperation | null; remainingMinor: number }> {
  const [
    { data: existing, error: operationError },
    { data: balance, error: balanceError },
  ] = await Promise.all([
    serverSupabase
      .from('escrow_refund_operations')
      .select('*')
      .eq('request_key', input.requestKey)
      .maybeSingle(),
    serverSupabase
      .from('escrow_refund_balances')
      .select('remaining_minor,needs_review')
      .eq('escrow_id', input.escrowId)
      .maybeSingle(),
  ]);
  if (operationError || balanceError)
    throw new InternalServerError('Refund status could not be loaded');
  const op = existing ? operationFrom(existing) : null;
  if (
    op &&
    (op.actor_id !== input.actorId || op.escrow_id !== input.escrowId)
  ) {
    throw new ConflictError('Refund request belongs to a different operation');
  }
  const remainingMinor = balance
    ? balance.remaining_minor
    : Math.round(Number(input.originalAmount) * 100);
  if (
    balance?.needs_review ||
    !Number.isSafeInteger(remainingMinor) ||
    remainingMinor < 0
  ) {
    throw new ConflictError('Refund balance requires reconciliation');
  }
  return { existing: op, remainingMinor };
}

async function recordOutcome(
  op: RefundOperation,
  refund: Stripe.Refund | null
): Promise<RefundOperation> {
  if (refund) {
    const intentId =
      typeof refund.payment_intent === 'string'
        ? refund.payment_intent
        : refund.payment_intent?.id;
    if (
      intentId !== op.payment_intent_id ||
      refund.amount !== op.cash_minor ||
      refund.currency !== 'gbp' ||
      refund.metadata?.refundOperationId !== op.id ||
      (op.provider_refund_id && op.provider_refund_id !== refund.id)
    ) {
      throw new ConflictError(
        'Provider refund does not match its recorded operation'
      );
    }
  } else if (op.cash_minor !== 0) {
    throw new ConflictError('Cash refunds require a verified provider outcome');
  }
  const { data, error } = await serverSupabase.rpc(
    'record_escrow_refund_outcome',
    {
      p_operation_id: op.id,
      p_refund_id: refund?.id ?? null,
      p_state: refund ? refund.status : 'succeeded',
    }
  );
  if (error)
    throw new InternalServerError(
      'Refund recording is awaiting recovery. Do not create another refund.'
    );
  const result = operationFrom(data);
  if (result.id !== op.id)
    throw new InternalServerError(
      'Refund recording returned a different operation'
    );
  if (result.state === 'reconciliation_required')
    throw new ConflictError('The refund needs payment reconciliation');
  return result;
}

/** Verify original cash funding and all previous cash refunds before moving more money. */
async function verifyRemainingFunding(op: RefundOperation): Promise<void> {
  const [
    { data: balance, error: balanceError },
    { data: escrow, error: escrowError },
  ] = await Promise.all([
    serverSupabase
      .from('escrow_refund_balances')
      .select('*')
      .eq('escrow_id', op.escrow_id)
      .single(),
    serverSupabase
      .from('escrow_transactions')
      .select('job_id,payer_id,payee_id,payment_intent_id')
      .eq('id', op.escrow_id)
      .single(),
  ]);
  if (
    balanceError ||
    escrowError ||
    !balance ||
    !escrow ||
    balance.needs_review ||
    escrow.payer_id !== op.actor_id ||
    escrow.payment_intent_id !== op.payment_intent_id ||
    balance.remaining_minor < op.gross_minor
  ) {
    throw new ConflictError('Refund funding requires reconciliation');
  }
  const intent = await stripeWithTimeout(
    () =>
      stripe.paymentIntents.retrieve(op.payment_intent_id, {
        expand: ['latest_charge'],
      }),
    'verify-refund-funding',
    10000
  );
  const charge =
    typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  if (
    intent.status !== 'succeeded' ||
    intent.currency !== 'gbp' ||
    intent.amount_received !== balance.cash_minor ||
    (intent.metadata.jobId ?? intent.metadata.job_id) !== escrow.job_id ||
    (intent.metadata.payerId ?? intent.metadata.payer_id) !== escrow.payer_id ||
    (intent.metadata.contractorId ?? intent.metadata.contractor_id) !==
      escrow.payee_id ||
    Number(intent.metadata.creditAppliedPence ?? 0) !== balance.credit_minor ||
    !charge ||
    !charge.paid ||
    !charge.captured ||
    charge.disputed ||
    charge.currency !== 'gbp' ||
    charge.amount !== balance.cash_minor ||
    charge.amount_refunded !== balance.cash_refunded_minor
  ) {
    throw new ConflictError(
      'Provider cash and refund balances require reconciliation'
    );
  }
}

/** Reuses a durable operation after timeouts, process crashes, and lost DB writes. */
export async function recoverRefund(
  op: RefundOperation
): Promise<RefundOperation> {
  if (op.state === 'reconciliation_required')
    throw new ConflictError('Refund requires reconciliation');
  if (op.provider_refund_id) {
    const providerRefundId = op.provider_refund_id;
    const refund = await stripeWithTimeout(
      () => stripe.refunds.retrieve(providerRefundId),
      'retrieve-refund',
      10000
    );
    return recordOutcome(op, refund);
  }
  if (op.cash_minor === 0) {
    if (op.state === 'succeeded') return op;
    await verifyRemainingFunding(op);
    return recordOutcome(op, null);
  }
  // Recover the provider ID even when Stripe succeeded but its response or the
  // database write was lost. Exhaust pagination before deciding no match exists.
  let after: string | undefined;
  let found: Stripe.Refund | undefined;
  for (let page = 0; page < 10; page++) {
    const refunds = await stripeWithTimeout(
      () =>
        stripe.refunds.list({
          payment_intent: op.payment_intent_id,
          limit: 100,
          ...(after ? { starting_after: after } : {}),
        }),
      'find-refund',
      10000
    );
    for (const refund of refunds.data) {
      if (refund.metadata?.refundOperationId !== op.id) continue;
      if (found && found.id !== refund.id)
        throw new ConflictError(
          'Multiple provider refunds require reconciliation'
        );
      found = refund;
    }
    if (!refunds.has_more) break;
    after = refunds.data.at(-1)?.id;
    if (!after || page === 9)
      throw new ConflictError('Refund history requires reconciliation');
  }
  if (found) {
    const refundId = found.id;
    const current = await stripeWithTimeout(
      () => stripe.refunds.retrieve(refundId),
      'retrieve-refund',
      10000
    );
    return recordOutcome(op, current);
  }
  const created = Date.parse(op.created_at);
  if (!Number.isFinite(created) || Date.now() - created > 23 * 60 * 60 * 1000) {
    throw new ConflictError(
      'Unresolved refund is too old to safely recreate. Reconciliation is required.'
    );
  }
  if (
    op.stripe_parameters.payment_intent !== op.payment_intent_id ||
    op.stripe_parameters.amount !== op.cash_minor ||
    !op.stripe_parameters.metadata ||
    typeof op.stripe_parameters.metadata !== 'object' ||
    op.stripe_parameters.metadata.refundOperationId !== op.id
  ) {
    throw new ConflictError(
      'Frozen refund parameters do not match the operation'
    );
  }
  await verifyRemainingFunding(op);
  const refund = await stripeWithTimeout(
    () =>
      stripe.refunds.create(op.stripe_parameters, {
        idempotencyKey: `escrow_refund_${op.id}`,
      }),
    'create-refund',
    10000
  );
  return recordOutcome(op, refund);
}

/** Use only from signature-verified webhooks; retrieve current state to handle replay/order. */
export async function reconcileRefundEvent(
  refund: Stripe.Refund
): Promise<boolean> {
  const operationId = refund.metadata?.refundOperationId;
  if (!operationId) return false;
  const { data, error } = await serverSupabase
    .from('escrow_refund_operations')
    .select('*')
    .eq('id', operationId)
    .single();
  if (error || !data)
    throw new InternalServerError(
      'Refund event is awaiting its durable operation'
    );
  const op = operationFrom(data);
  const current = await stripeWithTimeout(
    () => stripe.refunds.retrieve(refund.id),
    'reconcile-refund-event',
    10000
  );
  await recordOutcome(op, current);
  return true;
}
