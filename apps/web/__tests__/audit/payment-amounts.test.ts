import { describe, expect, it } from 'vitest';
import {
  paymentAmounts,
  summarizePayments,
} from '@/lib/payments/payment-amounts';

describe('payment history refund accounting', () => {
  it('reconciles the eight full payment journeys, including the released split refund', () => {
    const payments = [
      ...Array.from({ length: 3 }, () => ({
        amount: 120,
        remainingAmount: 120,
        status: 'released',
      })),
      { amount: 120, remainingAmount: 60, status: 'released' },
      ...Array.from({ length: 3 }, () => ({
        amount: 120,
        remainingAmount: 0,
        status: 'refunded',
      })),
      { amount: 120, remainingAmount: 120, status: 'disputed' },
    ];
    expect(summarizePayments(payments)).toEqual({
      totalPaid: 420,
      refundedAmount: 420,
      inEscrowAmount: 0,
      paidTransactionCount: 4,
    });
    expect(payments.filter((p) => paymentAmounts(p).refunded > 0)).toHaveLength(
      4
    );
  });
  it('counts only unrefunded principal as protected while work continues', () => {
    expect(
      summarizePayments([{ amount: 120, remainingAmount: 90, status: 'held' }])
    ).toEqual({
      totalPaid: 90,
      refundedAmount: 30,
      inEscrowAmount: 90,
      paidTransactionCount: 1,
    });
  });
  it('supports old fully refunded records without a balance and excludes uncaptured payments', () => {
    expect(
      summarizePayments([
        { amount: 50, status: 'refunded' },
        { amount: 70, status: 'pending' },
      ])
    ).toEqual({
      totalPaid: 0,
      refundedAmount: 50,
      inEscrowAmount: 0,
      paidTransactionCount: 0,
    });
  });
  it('sums in pence without floating point residue', () => {
    expect(
      summarizePayments([
        { amount: 0.1, status: 'held' },
        { amount: 0.2, status: 'held' },
      ]).totalPaid
    ).toBe(0.3);
  });
  it.each([-1, 121, NaN, Infinity])(
    'rejects impossible remaining principal %s',
    (remainingAmount) => {
      expect(() =>
        paymentAmounts({ amount: 120, remainingAmount, status: 'released' })
      ).toThrow('Invalid payment amount');
    }
  );
});
