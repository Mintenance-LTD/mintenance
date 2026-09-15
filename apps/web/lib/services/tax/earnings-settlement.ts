interface RefundBalance {
  gross_minor: number;
  remaining_minor: number;
  needs_review: boolean;
}
export interface EarningsSettlementRow {
  amount: number | string | null;
  platform_fee: number | string | null;
  stripe_processing_fee: number | string | null;
  contractor_payout: number | string | null;
  refund_balance?: RefundBalance | RefundBalance[] | null;
}
const unreconciled = () =>
  new Error(
    'Earnings payment requires reconciliation before a statement can be issued'
  );
function minor(value: number | string | null): number {
  if (value === null || (typeof value === 'string' && !value.trim()))
    throw unreconciled();
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    !Number.isSafeInteger(cents) ||
    cents < 0 ||
    Math.abs(amount * 100 - cents) > 0.00001
  )
    throw unreconciled();
  return cents;
}

/** Statement deductions reconcile to the recorded payout, not platform costs. */
export function earningsSettlement(row: EarningsSettlementRow) {
  const original = minor(row.amount);
  if (Array.isArray(row.refund_balance) && row.refund_balance.length > 1)
    throw unreconciled();
  const balance = Array.isArray(row.refund_balance)
    ? row.refund_balance[0]
    : row.refund_balance;
  if (
    balance &&
    (balance.needs_review !== false ||
      balance.gross_minor !== original ||
      !Number.isSafeInteger(balance.remaining_minor) ||
      balance.remaining_minor < 0 ||
      balance.remaining_minor > original)
  )
    throw unreconciled();
  const gross = balance ? balance.remaining_minor : original;
  const platform = minor(row.platform_fee);
  const paid = minor(row.contractor_payout);
  const deductedProcessing = gross - platform - paid;
  if (deductedProcessing < 0) throw unreconciled();
  // Historical payouts sometimes deducted processing costs. Preserve that
  // recorded deduction only when its amount reconciles exactly; modern payouts
  // deduct platform fees alone, regardless of the platform's own Stripe cost.
  if (
    deductedProcessing > 0 &&
    deductedProcessing !== minor(row.stripe_processing_fee)
  )
    throw unreconciled();
  return {
    gross: gross / 100,
    platformFee: platform / 100,
    stripeFee: deductedProcessing / 100,
    net: paid / 100,
  };
}
