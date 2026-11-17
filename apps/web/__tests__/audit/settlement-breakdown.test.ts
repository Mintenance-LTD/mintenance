import { expect, it } from 'vitest';
import { settlementBreakdown } from '@/lib/payments/settlement-breakdown';
it('shows the £1.20 payment and 50p fee without rounding away pence', () => {
  expect(settlementBreakdown(120, 0.1, 'pay_contractor')).toEqual({
    principalMinor: 120,
    refundMinor: 0,
    releaseMinor: 120,
    feeMinor: 50,
    payoutMinor: 70,
  });
  expect(settlementBreakdown(120, 0.1, 'refund_homeowner')).toEqual({
    principalMinor: 120,
    refundMinor: 120,
    releaseMinor: 0,
    feeMinor: 0,
    payoutMinor: 0,
  });
});
it('assigns an odd penny to release principal and caps the minimum fee', () => {
  expect(settlementBreakdown(121, 0.1, 'split_50_50')).toEqual({
    principalMinor: 121,
    refundMinor: 60,
    releaseMinor: 61,
    feeMinor: 50,
    payoutMinor: 11,
  });
  expect(settlementBreakdown(30, 0.1, 'pay_contractor').payoutMinor).toBe(0);
});
it('matches decimal half-up fee rounding rather than binary float artefacts', () => {
  expect(settlementBreakdown(2005, 0.1, 'pay_contractor').feeMinor).toBe(201);
  expect(settlementBreakdown(1425, 0.14, 'pay_contractor').feeMinor).toBe(200);
});
it.each([0, -1, NaN, Infinity, 1.5])(
  'rejects invalid principal %s',
  (principal) =>
    expect(() =>
      settlementBreakdown(principal, 0.1, 'pay_contractor')
    ).toThrow()
);
