import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { ConflictError } from '@/lib/errors/api-error';
import type Stripe from 'stripe';

export interface PaymentFundingReservation {
  id: string;
  created_at: string;
  gross_minor: number;
  cash_minor: number;
  credit_minor: number;
  state: 'reserved' | 'attached' | 'cancelled';
}

export async function reservePaymentFunding(input: {
  actorId: string;
  jobId: string;
  bidId: string;
  contractId: string;
  requestKey: string;
  grossMinor: number;
}): Promise<PaymentFundingReservation> {
  const { data, error } = await serverSupabase.rpc('reserve_payment_funding', {
    p_actor_id: input.actorId,
    p_job_id: input.jobId,
    p_bid_id: input.bidId,
    p_contract_id: input.contractId,
    p_request_key: input.requestKey,
    p_gross_minor: input.grossMinor,
  });
  const reservation = Array.isArray(data) ? data[0] : data;
  if (
    error ||
    !reservation ||
    reservation.gross_minor !== input.grossMinor ||
    !Number.isSafeInteger(reservation.cash_minor) ||
    reservation.cash_minor <= 0 ||
    !Number.isSafeInteger(reservation.credit_minor) ||
    reservation.credit_minor < 0 ||
    reservation.cash_minor + reservation.credit_minor !== input.grossMinor ||
    !['reserved', 'attached'].includes(reservation.state)
  ) {
    throw new InternalServerError(
      'Payment funding could not be reserved. Please retry the same payment.'
    );
  }
  const createdAt = Date.parse(reservation.created_at);
  if (
    !Number.isFinite(createdAt) ||
    Date.now() - createdAt > 23 * 60 * 60 * 1000
  ) {
    throw new InternalServerError(
      'Payment funding requires reconciliation before another provider request.'
    );
  }
  return reservation;
}

export async function attachPaymentFunding(
  reservationId: string,
  paymentIntentId: string
) {
  const { data, error } = await serverSupabase.rpc('attach_payment_funding', {
    p_reservation_id: reservationId,
    p_payment_intent_id: paymentIntentId,
  });
  const escrow = Array.isArray(data) ? data[0] : data;
  if (error || !escrow?.id || escrow.payment_intent_id !== paymentIntentId) {
    throw new InternalServerError(
      'Payment setup is awaiting recovery. Please retry the same payment.'
    );
  }
  return escrow;
}

/** Metadata alone cannot authorize a platform subsidy. Require its trusted ledger. */
export async function getEscrowCashRequirement(
  escrowId: string,
  grossAmount: number,
  intentId: string,
  metadata: Record<string, string>
): Promise<number> {
  const grossMinor = Math.round(Number(grossAmount) * 100);
  const creditMinor = Number(metadata.creditAppliedPence ?? 0);
  if (
    !Number.isSafeInteger(grossMinor) ||
    grossMinor <= 0 ||
    !Number.isSafeInteger(creditMinor) ||
    creditMinor < 0
  ) {
    throw new ConflictError(
      'Invalid escrow funding amounts; reconciliation is required'
    );
  }
  if (creditMinor === 0) return grossMinor;
  const { data: funding, error } = await serverSupabase
    .from('payment_funding_reservations')
    .select(
      'id, state, gross_minor, cash_minor, credit_minor, payment_intent_id'
    )
    .eq('escrow_id', escrowId)
    .maybeSingle();
  if (
    error ||
    !funding ||
    funding.state !== 'attached' ||
    funding.id !== metadata.fundingReservationId ||
    funding.payment_intent_id !== intentId ||
    funding.gross_minor !== grossMinor ||
    funding.credit_minor !== creditMinor ||
    !Number.isSafeInteger(funding.cash_minor) ||
    funding.cash_minor <= 0 ||
    funding.cash_minor + creditMinor !== grossMinor
  ) {
    throw new ConflictError('Platform credit funding requires reconciliation');
  }
  return funding.cash_minor;
}

/** Recover only from an authenticated provider event, never from client metadata. */
export async function reconcileReservedFundingIntent(
  intent: Stripe.PaymentIntent
) {
  const reservationId = intent.metadata.fundingReservationId;
  const { data: funding, error } = await serverSupabase
    .from('payment_funding_reservations')
    .select('*')
    .eq('id', reservationId)
    .single();
  if (
    error ||
    !funding ||
    !reservationId ||
    intent.currency !== 'gbp' ||
    intent.amount !== funding.cash_minor ||
    intent.metadata.payerId !== funding.payer_id ||
    intent.metadata.contractorId !== funding.payee_id ||
    intent.metadata.jobId !== funding.job_id ||
    intent.metadata.bidId !== funding.bid_id ||
    intent.metadata.contractId !== funding.contract_id ||
    Number(intent.metadata.creditAppliedPence) !== funding.credit_minor ||
    (funding.payment_intent_id && funding.payment_intent_id !== intent.id)
  ) {
    throw new ConflictError(
      'Provider event does not match its funding reservation'
    );
  }
  if (intent.status === 'canceled') {
    const result = await serverSupabase.rpc('cancel_payment_funding', {
      p_reservation_id: reservationId,
      p_actor_id: funding.payer_id,
      p_cancelled_intent_id: intent.id,
    });
    if (result.error || result.data !== true) {
      throw new InternalServerError(
        'Cancelled payment credit restoration requires retry'
      );
    }
    return null;
  }
  if (
    intent.status !== 'succeeded' ||
    intent.amount_received !== funding.cash_minor
  ) {
    throw new ConflictError('Provider funding has not settled');
  }
  return attachPaymentFunding(reservationId, intent.id);
}
