export type SettlementDecision =
  | 'refund_homeowner'
  | 'pay_contractor'
  | 'split_50_50';
export interface SettlementConfirmation {
  principalMinor: number;
  feeRate: number;
  payerId: string;
  payeeId: string;
}
export interface SettlementPreview {
  escrowId: string;
  decision: SettlementDecision;
  principalMinor: number;
  refundMinor: number;
  releaseMinor: number;
  feeMinor: number;
  payoutMinor: number;
  confirmation: SettlementConfirmation;
}

/** Match reserve_admin_escrow_release: integer pence, 50p minimum capped at principal. */
export function settlementBreakdown(
  principalMinor: number,
  feeRate: number,
  decision: SettlementDecision
) {
  if (
    !Number.isSafeInteger(principalMinor) ||
    principalMinor <= 0 ||
    !Number.isFinite(feeRate) ||
    feeRate < 0 ||
    feeRate > 1 ||
    (decision === 'split_50_50' && principalMinor < 2)
  )
    throw new Error('Settlement balance is unavailable.');
  const refundMinor =
    decision === 'refund_homeowner'
      ? principalMinor
      : decision === 'split_50_50'
        ? Math.floor(principalMinor / 2)
        : 0;
  const releaseMinor = principalMinor - refundMinor;
  const scaledRate = Math.round(feeRate * 1_000_000);
  if (
    Math.abs(scaledRate / 1_000_000 - feeRate) > Number.EPSILON ||
    !Number.isSafeInteger(releaseMinor * scaledRate + 500_000)
  )
    throw new Error('Fee precision requires review.');
  const feeMinor = releaseMinor
    ? Math.min(
        releaseMinor,
        Math.max(
          50,
          Math.floor((releaseMinor * scaledRate + 500_000) / 1_000_000)
        )
      )
    : 0;
  return {
    principalMinor,
    refundMinor,
    releaseMinor,
    feeMinor,
    payoutMinor: releaseMinor - feeMinor,
  };
}
