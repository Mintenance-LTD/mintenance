export interface PaymentAmountsInput {
  amount: number;
  remainingAmount?: number;
  status: string;
}

/** Remaining principal excludes confirmed refunds, including split settlements. */
export function paymentAmounts(payment: PaymentAmountsInput) {
  const gross = Math.round(payment.amount * 100);
  const remaining = Math.round(
    (payment.remainingAmount ??
      (payment.status === 'refunded' ? 0 : payment.amount)) * 100
  );
  if (
    !Number.isSafeInteger(gross) ||
    gross < 0 ||
    !Number.isSafeInteger(remaining) ||
    remaining < 0 ||
    remaining > gross
  ) {
    throw new Error('Invalid payment amount or refund balance');
  }
  return {
    gross: gross / 100,
    remaining: remaining / 100,
    refunded: (gross - remaining) / 100,
  };
}

export function summarizePayments(payments: PaymentAmountsInput[]) {
  const totals = {
    totalPaid: 0,
    paidTransactionCount: 0,
    inEscrowAmount: 0,
    refundedAmount: 0,
  };
  for (const payment of payments) {
    const amounts = paymentAmounts(payment);
    totals.refundedAmount += Math.round(amounts.refunded * 100);
    if (
      [
        'completed',
        'released',
        'release_pending',
        'held',
        'awaiting_homeowner_approval',
      ].includes(payment.status)
    ) {
      totals.totalPaid += Math.round(amounts.remaining * 100);
      if (amounts.remaining > 0) totals.paidTransactionCount++;
    }
    if (
      ['held', 'release_pending', 'awaiting_homeowner_approval'].includes(
        payment.status
      )
    ) {
      totals.inEscrowAmount += Math.round(amounts.remaining * 100);
    }
  }
  return {
    ...totals,
    totalPaid: totals.totalPaid / 100,
    inEscrowAmount: totals.inEscrowAmount / 100,
    refundedAmount: totals.refundedAmount / 100,
  };
}
