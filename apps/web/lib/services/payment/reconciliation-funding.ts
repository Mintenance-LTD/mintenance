import type Stripe from 'stripe';

export interface ReconciliationSource {
  id: string;
  payment_intent_id: string;
  amount: number;
  status: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  funding: null | {
    id: string;
    state: string;
    gross_minor: number;
    cash_minor: number;
    credit_minor: number;
    payment_intent_id: string;
  };
  refund: null | {
    gross_minor: number;
    cash_minor: number;
    credit_minor: number;
    cash_refunded_minor: number;
    credit_returned_minor: number;
    remaining_minor: number;
    needs_review: boolean;
  };
}
const STATUS_MAP: Record<string, string[]> = {
  pending: [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
  ],
  held: ['succeeded'],
  released: ['succeeded'],
  completed: ['succeeded'],
  release_pending: ['succeeded'],
  pending_review: ['succeeded'],
  awaiting_homeowner_approval: ['succeeded'],
  refunded: ['succeeded'],
  failed: ['canceled', 'requires_payment_method'],
  cancelled: ['canceled'],
  canceled: ['canceled'],
};
const minor = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** Compare provider cash against the trusted funding ledger, including retired refunded reservations. */
export function compareReconciliationFunding(
  source: ReconciliationSource,
  intent: Stripe.PaymentIntent
) {
  const gross = Math.round(Number(source.amount) * 100);
  const funding = source.funding;
  const cash = funding?.cash_minor ?? gross;
  const credit = funding?.credit_minor ?? 0;
  const metadata = intent.metadata ?? {};
  const fundingMatch =
    minor(gross) &&
    gross > 0 &&
    minor(cash) &&
    cash > 0 &&
    minor(credit) &&
    cash + credit === gross &&
    (!funding ||
      ((funding.state === 'attached' ||
        (funding.state === 'cancelled' && source.status === 'refunded')) &&
        funding.gross_minor === gross &&
        funding.payment_intent_id === intent.id &&
        metadata.fundingReservationId === funding.id)) &&
    Number(metadata.creditAppliedPence ?? 0) === credit;
  const identityMatch =
    intent.id === source.payment_intent_id &&
    (metadata.jobId ?? metadata.job_id) === source.job_id &&
    (metadata.payerId ?? metadata.payer_id) === source.payer_id &&
    (metadata.contractorId ?? metadata.contractor_id) === source.payee_id;
  const amountMatch =
    fundingMatch &&
    intent.currency === 'gbp' &&
    intent.amount === cash &&
    (intent.status !== 'succeeded' || intent.amount_received === cash);
  const statusMatch = (STATUS_MAP[source.status] ?? []).includes(intent.status);
  const refund = source.refund;
  const refundMatch =
    !refund ||
    (!refund.needs_review &&
      refund.gross_minor === gross &&
      refund.cash_minor === cash &&
      refund.credit_minor === credit &&
      minor(refund.cash_refunded_minor) &&
      refund.cash_refunded_minor <= cash &&
      minor(refund.credit_returned_minor) &&
      refund.credit_returned_minor <= credit &&
      refund.remaining_minor ===
        gross - refund.cash_refunded_minor - refund.credit_returned_minor);
  const charge =
    typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  const refundedCash = refund?.cash_refunded_minor ?? 0;
  const capturedMatch =
    intent.status !== 'succeeded' ||
    (!!charge &&
      charge.paid &&
      charge.captured &&
      !charge.disputed &&
      charge.currency === 'gbp' &&
      charge.amount === cash &&
      charge.amount_refunded === refundedCash &&
      charge.refunded === (refundedCash === cash));
  const terminalRefundMatch =
    source.status !== 'refunded' || (!!refund && refund.remaining_minor === 0);
  const matched =
    identityMatch &&
    amountMatch &&
    statusMatch &&
    refundMatch &&
    capturedMatch &&
    terminalRefundMatch;
  return {
    matched,
    evidence: {
      stripe_status: intent.status,
      stripe_amount: intent.amount / 100,
      expected_cash_minor: cash,
      mismatch_type: !amountMatch ? 'amount' : 'status',
      identity_match: identityMatch,
      amount_match: amountMatch,
      status_match: statusMatch,
      refund_match: refundMatch && capturedMatch && terminalRefundMatch,
    },
  };
}
