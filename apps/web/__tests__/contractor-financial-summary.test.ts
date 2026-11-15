import { describe, it, expect } from 'vitest';
import {
  contractorFinancialSummary,
  recordedContractorPayout,
  type ContractorPayment,
} from '@/lib/contractor/financial-summary';
import { platformFeeBreakdown } from '@mintenance/shared';
import { transformPayments } from '@/app/contractor/(dashboard)/finance/_components/transaction-data';

const payment = (
  overrides: Partial<ContractorPayment> = {}
): ContractorPayment => ({
  id: 'e1',
  job_id: 'j1',
  amount: 1,
  status: 'held',
  platform_fee: 0,
  contractor_payout: 0,
  created_at: '2026-11-01T12:00:00Z',
  ...overrides,
});
describe('contractor financial summary', () => {
  it('ignores unfinalized zero fees, preserves disputes and orders by the date shown to the contractor', () => {
    const rows = transformPayments(
      [
        {
          id: 'held',
          payerId: 'h',
          payeeId: 'c',
          amount: 1,
          status: 'held',
          platformFee: 0,
          contractorPayout: 0,
          createdAt: '2026-11-10',
        },
        {
          id: 'paid',
          payerId: 'h',
          payeeId: 'c',
          amount: 1,
          status: 'completed',
          platformFee: 0.5,
          contractorPayout: 0.5,
          createdAt: '2026-01-01',
          releasedAt: '2026-11-15',
        },
        {
          id: 'dispute',
          payerId: 'h',
          payeeId: 'c',
          amount: 2,
          remainingAmount: 1,
          status: 'disputed',
          createdAt: '2026-11-11',
        },
        {
          id: 'failed',
          payerId: 'h',
          payeeId: 'c',
          amount: 10,
          status: 'failed',
          createdAt: '2026-11-12',
        },
      ],
      0.05
    );
    expect(rows.map((row) => row.id)).toEqual([
      'paid',
      'failed',
      'dispute',
      'held',
    ]);
    expect(rows.find((row) => row.id === 'held')).toMatchObject({
      feesFinalized: false,
      platformFee: 0.5,
      netAmount: 0.5,
    });
    expect(rows.find((row) => row.id === 'paid')).toMatchObject({
      feesFinalized: true,
      platformFee: 0.5,
      netAmount: 0.5,
    });
    expect(rows.find((row) => row.id === 'dispute')).toMatchObject({
      status: 'disputed',
      netAmount: 0.5,
    });
    expect(rows.find((row) => row.id === 'failed')).toMatchObject({
      netAmount: 0,
    });
  });
  it('separates received net earnings from funded balances and excludes unpaid/failed rows', () => {
    const result = contractorFinancialSummary(
      [
        payment(),
        payment({
          id: 'e2',
          amount: 2.2,
          status: 'released',
          platform_fee: 1,
          contractor_payout: 1.2,
          released_at: '2026-11-14T12:00:00Z',
        }),
        payment({ id: 'e3', amount: 1000, status: 'pending' }),
        payment({ id: 'e4', amount: 1000, status: 'failed' }),
        payment({
          id: 'e5',
          amount: 10,
          status: 'disputed',
          remaining_minor: 200,
        }),
      ],
      new Date('2026-11-15T12:00:00Z')
    );
    expect(result.allTimeRevenue).toBe(1.2);
    expect(result.thisMonthRevenue).toBe(1.2);
    expect(result.pendingPayouts).toBe(3);
    expect(result.heldCount).toBe(2);
  });
  it('uses all payments, counts paid jobs once and places release dates in the UK month', () => {
    const rows = Array.from({ length: 51 }, (_, i) =>
      payment({
        id: String(i),
        amount: 2,
        status: 'released',
        platform_fee: 0.5,
        contractor_payout: 1.5,
        released_at: '2026-06-30T23:30:00Z',
      })
    );
    const result = contractorFinancialSummary(
      rows,
      new Date('2026-07-01T12:00:00Z')
    );
    expect(result.allTimeRevenue).toBe(76.5);
    expect(result.avgJobValue).toBe(76.5);
    expect(result.monthlyRevenue.at(-1)).toMatchObject({
      monthKey: '2026-07',
      revenue: 76.5,
      jobs: 1,
    });
  });
  it('fails closed for unrecorded release fees or impossible refund balances', () => {
    expect(() => recordedContractorPayout({ amount: 1 })).toThrow(
      /reconciliation/
    );
    expect(() =>
      recordedContractorPayout({ amount: 1, contractor_payout: 2 })
    ).toThrow(/reconciliation/);
    expect(() =>
      contractorFinancialSummary([payment({ remaining_minor: -1 })])
    ).toThrow(/reconciliation/);
  });
  it('applies the existing fifty-pence minimum to estimates without rewriting stored release fees', () => {
    expect(platformFeeBreakdown(1, 0.05)).toMatchObject({
      platformFee: 0.5,
      netToContractor: 0.5,
    });
    expect(
      recordedContractorPayout({
        amount: 1,
        platform_fee: 0.2,
        contractor_payout: 0.8,
      })
    ).toBe(0.8);
  });
});
