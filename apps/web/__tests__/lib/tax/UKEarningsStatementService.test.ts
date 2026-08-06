/**
 * UKEarningsStatementService tests (Task 2).
 *
 * Proves a contractor's UK-tax-year earnings statement is aggregated correctly
 * from released escrow rows: gross / platform fee / Stripe fee / net, distinct
 * job count, and the tax-year window on released_at.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { UKEarningsStatementService } from '@/lib/services/tax/UKEarningsStatementService';

/** A chain that is awaitable (resolves to `result`) and whose .single() resolves too. */
function chain(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const passthrough = () => obj;
  for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order']) {
    obj[m] = vi.fn(passthrough);
  }
  obj.single = vi.fn(() => Promise.resolve(result));
  // Make the chain itself awaitable for queries that don't end in .single().
  (obj as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return obj;
}

describe('UKEarningsStatementService.getStatement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aggregates released escrow rows within the 2025-26 tax year', async () => {
    const escrowRows = [
      {
        job_id: 'job-1',
        amount: 1000,
        platform_fee: 120,
        stripe_processing_fee: 15.2,
        contractor_payout: 864.8,
        released_at: '2025-06-01T10:00:00Z',
        status: 'completed',
        jobs: { title: 'Bathroom refit' },
      },
      {
        job_id: 'job-2',
        amount: 500,
        platform_fee: 60,
        stripe_processing_fee: 7.7,
        contractor_payout: 432.3,
        released_at: '2026-01-15T10:00:00Z',
        status: 'released',
        jobs: [{ title: 'Leak fix' }],
      },
    ];

    mocks.from.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') {
        return chain({ data: escrowRows, error: null });
      }
      if (table === 'contractor_tax_profiles') {
        return chain({
          data: {
            tax_name: 'Jane Plumber',
            business_name: 'Jane P Ltd',
            vat_registered: true,
            vat_number: '123456789',
            company_number: '12345678',
            address_line1: '1 High St',
            address_line2: null,
            city: 'Leeds',
            county: 'West Yorkshire',
            postcode: 'LS1 1AA',
            utr_encrypted: { ciphertext: 'x' },
          },
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });

    const statement = await UKEarningsStatementService.getStatement(
      'contractor-1',
      2025
    );

    expect(statement.taxYear).toBe('2025-26');
    expect(statement.totals.grossEarnings).toBe(1500);
    expect(statement.totals.platformFees).toBe(180);
    expect(statement.totals.stripeFees).toBe(22.9);
    expect(statement.totals.netPaid).toBe(1297.1);
    expect(statement.totals.jobCount).toBe(2);
    expect(statement.totals.paymentCount).toBe(2);
    expect(statement.payments).toHaveLength(2);
    expect(statement.payments[1].jobTitle).toBe('Leak fix'); // array-shaped join handled
    expect(statement.contractor?.legalName).toBe('Jane Plumber');
    expect(statement.contractor?.vatRegistered).toBe(true);
    expect(statement.contractor?.utrOnFile).toBe(true);
  });

  it('falls back to gross minus fees when contractor_payout is null', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') {
        return chain({
          data: [
            {
              job_id: 'job-9',
              amount: 200,
              platform_fee: 24,
              stripe_processing_fee: 3.2,
              contractor_payout: null,
              released_at: '2025-09-01T10:00:00Z',
              status: 'completed',
              jobs: null,
            },
          ],
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });

    const statement = await UKEarningsStatementService.getStatement(
      'contractor-2',
      2025
    );
    expect(statement.totals.netPaid).toBe(172.8); // 200 - 24 - 3.2
    expect(statement.contractor).toBeNull();
  });
});
