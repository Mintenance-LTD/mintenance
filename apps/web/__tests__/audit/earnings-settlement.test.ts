import { describe, expect, it } from 'vitest';
import {
  earningsSettlement,
  type EarningsSettlementRow,
} from '@/lib/services/tax/earnings-settlement';

const row: EarningsSettlementRow = {
  amount: 500,
  platform_fee: 48,
  contractor_payout: 352,
  stripe_processing_fee: null,
  refund_balance: {
    gross_minor: 50000,
    remaining_minor: 40000,
    needs_review: false,
  },
};
describe('earnings settlement consistency', () => {
  it.each([
    { contractor_payout: null },
    { contractor_payout: 450 },
    { platform_fee: 'not-a-number' },
    { platform_fee: '48.001' },
    { contractor_payout: 350, stripe_processing_fee: 1.7 },
    {
      refund_balance: {
        gross_minor: 50000,
        remaining_minor: 40000,
        needs_review: true,
      },
    },
    {
      refund_balance: {
        gross_minor: 60000,
        remaining_minor: 40000,
        needs_review: false,
      },
    },
    {
      refund_balance: {
        gross_minor: 50000,
        remaining_minor: -1,
        needs_review: false,
      },
    },
  ])('refuses unreconciled records (%j)', (changes) => {
    expect(() => earningsSettlement({ ...row, ...changes })).toThrow(
      'requires reconciliation'
    );
  });
  it('supports the array-shaped relationship without substituting original principal', () => {
    expect(
      earningsSettlement({
        ...row,
        refund_balance: [
          { gross_minor: 50000, remaining_minor: 40000, needs_review: false },
        ],
      })
    ).toEqual({ gross: 400, platformFee: 48, stripeFee: 0, net: 352 });
  });
});
