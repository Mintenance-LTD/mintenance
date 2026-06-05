/**
 * Unit tests for FinancialReporter — pure read-side financial aggregations.
 *
 * Strategy:
 *   - The unit under test is NOT mocked.
 *   - Externals are mocked: `supabase` (config/supabase), `logger`, and
 *     `ServiceErrorHandler` (a thin wrapper whose deep deps —
 *     ErrorHandlingService, NetInfo, validators — are irrelevant to the
 *     aggregation logic). The ServiceErrorHandler mock preserves the two
 *     behaviours FinancialReporter actually depends on:
 *       * validateRequired throws on null/undefined/'' (drives the
 *         validation branch + the `!result.success` rethrow path)
 *       * executeOperation returns { success, data } / { success:false }
 *   - Date is pinned with jest fake timers so every relative-date branch
 *     (monthly buckets, tax-year start, cash-flow weeks, overdue filter)
 *     produces deterministic, exactly-asserted numbers.
 *
 * Pinned "now" = 2026-06-15T12:00:00.000Z (a Monday in June; UK tax year
 * 2026/27 already started on 2026-04-06).
 */

import {
  calculateDueDate,
  calculateFinancialTotals,
  getFinancialSummary,
} from '../FinancialReporter';
import { supabase } from '../../../../config/supabase';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../config/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Lightweight, behaviour-preserving ServiceErrorHandler mock.
jest.mock('../../../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: (value: unknown, fieldName: string) => {
      if (value === null || value === undefined || value === '') {
        throw new Error(`${fieldName} is required`);
      }
    },
    executeOperation: async (op: () => Promise<unknown>) => {
      try {
        const data = await op();
        return { data, success: true };
      } catch (error) {
        return { error, success: false };
      }
    },
  },
}));

import { logger } from '../../../../utils/logger';

const mockedSupabaseFrom = supabase.from as jest.Mock;
const mockedLoggerError = logger.error as jest.Mock;

// ---------------------------------------------------------------------------
// Supabase query-chain helper
// ---------------------------------------------------------------------------
//
// FinancialReporter builds chains like:
//   supabase.from('invoices').select(...).eq(...).eq(...).gte(...).lte(...)
// then `await`s the final builder. We model each builder as a thenable that
// records which table was queried and resolves to a caller-supplied result.

type SupabaseResult = { data: unknown; error: { message: string } | null };

interface TableConfig {
  // Resolve based on the table name. Each call to from(table) yields a new
  // chain that ultimately resolves to result(table).
  result: SupabaseResult;
}

function makeChain(result: SupabaseResult) {
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  for (const m of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'limit']) {
    chain[m] = jest.fn(passthrough);
  }
  // thenable so `await chain` resolves to the configured result
  chain.then = (
    onFulfilled: (v: SupabaseResult) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return chain;
}

/**
 * Configure supabase.from to return per-table results.
 * `tables` maps table name -> result. Unspecified tables resolve to empty.
 */
function configureTables(tables: Record<string, TableConfig>) {
  mockedSupabaseFrom.mockImplementation((table: string) => {
    const cfg = tables[table];
    const result: SupabaseResult = cfg ? cfg.result : { data: [], error: null };
    return makeChain(result);
  });
}

const PINNED_NOW = new Date('2026-06-15T12:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(PINNED_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ===========================================================================
// calculateDueDate
// ===========================================================================
describe('calculateDueDate', () => {
  it.each([
    ['30 days', 30],
    ['14 days', 14],
    ['7 days', 7],
    ['net 30', 30],
    ['net 14', 14],
    ['immediate', 0],
  ])('adds the right number of days for "%s"', (terms, days) => {
    const result = calculateDueDate(terms);
    const expected = new Date(PINNED_NOW);
    expected.setDate(expected.getDate() + days);
    expect(result).toBe(expected.toISOString());
  });

  it('defaults to 30 days for unknown payment terms', () => {
    const result = calculateDueDate('whenever-you-feel-like-it');
    const expected = new Date(PINNED_NOW);
    expected.setDate(expected.getDate() + 30);
    expect(result).toBe(expected.toISOString());
  });
});

// ===========================================================================
// calculateFinancialTotals
// ===========================================================================
describe('calculateFinancialTotals', () => {
  const periodStart = '2026-01-01T00:00:00.000Z';
  const periodEnd = '2026-06-30T23:59:59.999Z';

  it('computes revenue, expenses, profit, outstanding and overdue exactly', async () => {
    // due_date in the past => overdue; future => not overdue.
    configureTables({
      invoices: {
        // Note: BOTH fetchPaidInvoices and fetchOutstandingInvoices query
        // 'invoices'. We disambiguate by giving every invoices call the same
        // superset of fields; reducers only read the fields they need.
        result: {
          data: [
            {
              total_amount: 1000,
              due_date: '2026-01-10T00:00:00Z',
              status: 'paid',
            },
            {
              total_amount: 250.5,
              due_date: '2026-02-10T00:00:00Z',
              status: 'paid',
            },
          ],
          error: null,
        },
      },
      contractor_expenses: {
        result: {
          data: [{ amount: 300 }, { amount: 49.5 }],
          error: null,
        },
      },
    });

    const result = await calculateFinancialTotals(
      'contractor-1',
      periodStart,
      periodEnd
    );

    // Paid invoices reducer: 1000 + 250.5 = 1250.5
    expect(result.totalRevenue).toBe(1250.5);
    // Expenses reducer: 300 + 49.5 = 349.5
    expect(result.totalExpenses).toBe(349.5);
    expect(result.totalProfit).toBe(1250.5 - 349.5);
    // Outstanding reducer over the SAME invoices rows: 1250.5
    expect(result.outstandingInvoices).toBe(1250.5);
    // Both due dates are in the past relative to pinned now (June 2026) => both overdue
    expect(result.overdueAmount).toBe(1250.5);
  });

  it('separates overdue (past due_date) from not-yet-due invoices', async () => {
    configureTables({
      invoices: {
        result: {
          data: [
            {
              total_amount: 500,
              due_date: '2026-01-01T00:00:00Z',
              status: 'overdue',
            }, // past
            {
              total_amount: 800,
              due_date: '2026-12-01T00:00:00Z',
              status: 'sent',
            }, // future
          ],
          error: null,
        },
      },
      contractor_expenses: { result: { data: [], error: null } },
    });

    const result = await calculateFinancialTotals(
      'contractor-1',
      periodStart,
      periodEnd
    );

    expect(result.totalRevenue).toBe(1300); // both counted as "paid" rows here
    expect(result.totalExpenses).toBe(0);
    expect(result.outstandingInvoices).toBe(1300);
    expect(result.overdueAmount).toBe(500); // only the past-due one
  });

  it('returns zeros for empty datasets', async () => {
    configureTables({
      invoices: { result: { data: [], error: null } },
      contractor_expenses: { result: { data: [], error: null } },
    });

    const result = await calculateFinancialTotals(
      'contractor-1',
      periodStart,
      periodEnd
    );

    expect(result).toEqual({
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      outstandingInvoices: 0,
      overdueAmount: 0,
    });
  });

  it('handles null data from supabase (data ?? [])', async () => {
    configureTables({
      invoices: { result: { data: null, error: null } },
      contractor_expenses: { result: { data: null, error: null } },
    });

    const result = await calculateFinancialTotals(
      'contractor-1',
      periodStart,
      periodEnd
    );

    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(0);
  });

  it('logs and treats query errors as empty results (paid invoices error path)', async () => {
    configureTables({
      invoices: { result: { data: null, error: { message: 'boom-invoices' } } },
      contractor_expenses: {
        result: { data: null, error: { message: 'boom-expenses' } },
      },
    });

    const result = await calculateFinancialTotals(
      'contractor-1',
      periodStart,
      periodEnd
    );

    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.outstandingInvoices).toBe(0);
    // Errors logged for invoices (paid + outstanding) and expenses
    expect(mockedLoggerError).toHaveBeenCalledWith(
      'Error fetching paid invoices',
      'boom-invoices'
    );
    expect(mockedLoggerError).toHaveBeenCalledWith(
      'Error fetching expenses',
      'boom-expenses'
    );
    expect(mockedLoggerError).toHaveBeenCalledWith(
      'Error fetching outstanding invoices',
      'boom-invoices'
    );
  });

  it('throws when contractorId is missing (validation branch -> !result.success)', async () => {
    configureTables({});
    await expect(
      calculateFinancialTotals('', periodStart, periodEnd)
    ).rejects.toThrow('Failed to calculate financial totals');
  });

  it('throws when periodStart is missing', async () => {
    configureTables({});
    await expect(
      calculateFinancialTotals('c-1', '', periodEnd)
    ).rejects.toThrow('Failed to calculate financial totals');
  });

  it('throws when periodEnd is missing', async () => {
    configureTables({});
    await expect(
      calculateFinancialTotals('c-1', periodStart, '')
    ).rejects.toThrow('Failed to calculate financial totals');
  });
});

// ===========================================================================
// getFinancialSummary — the big integration of all private helpers
// ===========================================================================
describe('getFinancialSummary', () => {
  it('throws on missing contractorId', async () => {
    configureTables({});
    await expect(getFinancialSummary('')).rejects.toThrow(
      'Failed to get financial summary'
    );
  });

  it('returns an all-zero summary when every dataset is empty', async () => {
    configureTables({
      invoices: { result: { data: [], error: null } },
      contractor_expenses: { result: { data: [], error: null } },
      escrow_transactions: { result: { data: [], error: null } },
    });

    const summary = await getFinancialSummary('contractor-1');

    // 12 months, all zero
    expect(summary.monthly_revenue).toHaveLength(12);
    expect(summary.monthly_revenue.every((v) => v === 0)).toBe(true);
    // quarterly growth: prevQ = 0 -> branch returns 0
    expect(summary.quarterly_growth).toBe(0);
    // yearly projection: (0 / 12) * 12 = 0
    expect(summary.yearly_projection).toBe(0);
    expect(summary.outstanding_invoices).toBe(0);
    expect(summary.overdue_amount).toBe(0);
    expect(summary.profit_trends).toHaveLength(6);
    expect(
      summary.profit_trends.every(
        (t) => t.revenue === 0 && t.expenses === 0 && t.profit === 0
      )
    ).toBe(true);
    expect(summary.tax_obligations).toBe(0);
    expect(summary.cash_flow_forecast).toHaveLength(8);
    expect(summary.escrow_in_flight).toBe(0);
    expect(summary.escrow_revenue).toBe(0);
  });

  it('aggregates escrow by status and rolls in-flight into outstanding', async () => {
    // Escrow rows: in-flight statuses (pending/held/release_pending) and
    // earned (released/completed). Also exercises number coercion (string,
    // null, non-finite) and the status-null filter.
    configureTables({
      invoices: {
        // outstanding (sent/overdue) — used by getInvoicesSummary
        result: {
          data: [
            {
              total_amount: 200,
              due_date: '2026-01-01T00:00:00Z',
              status: 'overdue',
            },
            {
              total_amount: 100,
              due_date: '2026-12-01T00:00:00Z',
              status: 'sent',
            },
          ],
          error: null,
        },
      },
      contractor_expenses: { result: { data: [], error: null } },
      escrow_transactions: {
        result: {
          data: [
            { amount: 1000, status: 'held' }, // in-flight
            { amount: '500.5', status: 'pending' }, // in-flight, string coercion
            { amount: 250, status: 'release_pending' }, // in-flight
            { amount: 2000, status: 'released' }, // earned
            { amount: '3000', status: 'completed' }, // earned, string coercion
            { amount: null, status: 'held' }, // in-flight, null -> 0
            { amount: 'not-a-number', status: 'released' }, // earned, NaN -> 0
            { amount: 999, status: null }, // filtered out (status null)
            { amount: 999, status: 'cancelled' }, // filtered out (unknown status)
          ],
          error: null,
        },
      },
    });

    const summary = await getFinancialSummary('contractor-1');

    // in-flight = 1000 + 500.5 + 250 + 0 = 1750.5
    expect(summary.escrow_in_flight).toBe(1750.5);
    // earned = 2000 + 3000 + 0 = 5000
    expect(summary.escrow_revenue).toBe(5000);
    // outstanding invoices = 200 + 100 = 300; + escrow in-flight 1750.5
    expect(summary.outstanding_invoices).toBe(300 + 1750.5);
    // overdue: only the past-due overdue row (200), and status !== 'paid'
    expect(summary.overdue_amount).toBe(200);
  });

  it('logs and zeroes escrow when escrow query errors', async () => {
    configureTables({
      invoices: { result: { data: [], error: null } },
      contractor_expenses: { result: { data: [], error: null } },
      escrow_transactions: {
        result: { data: null, error: { message: 'escrow-down' } },
      },
    });

    const summary = await getFinancialSummary('contractor-1');

    expect(summary.escrow_in_flight).toBe(0);
    expect(summary.escrow_revenue).toBe(0);
    // fetchContractorEscrow + fetchReleasedEscrowByMonth both hit escrow_transactions
    expect(mockedLoggerError).toHaveBeenCalledWith(
      'Error fetching contractor escrow',
      'escrow-down'
    );
    expect(mockedLoggerError).toHaveBeenCalledWith(
      'Error fetching released escrow by month',
      'escrow-down'
    );
  });

  it('computes quarterly growth and yearly projection from monthly revenue', async () => {
    // We want a deterministic, non-zero monthly_revenue series. The monthly
    // revenue comes from paid invoices (per-month) + released escrow buckets.
    // To make it fully deterministic regardless of which month each query
    // targets, we give EVERY paid-invoice query the same single row, so each
    // of the 12 months gets the same invoice sum, and escrow buckets are
    // pinned to the current month via created_at = pinned now.
    configureTables({
      invoices: {
        result: {
          data: [
            {
              total_amount: 100,
              due_date: '2026-01-01T00:00:00Z',
              status: 'paid',
            },
          ],
          error: null,
        },
      },
      contractor_expenses: { result: { data: [], error: null } },
      escrow_transactions: {
        // fetchContractorEscrow + fetchReleasedEscrowByMonth share this.
        // Rows need amount/status (for totals) and created_at (for buckets).
        result: {
          data: [
            {
              amount: 600,
              status: 'released',
              created_at: PINNED_NOW.toISOString(), // June 2026 bucket
            },
          ],
          error: null,
        },
      },
    });

    const summary = await getFinancialSummary('contractor-1');

    // Each of 12 months: invoiceSum=100. The current month (last in series,
    // index 11) additionally gets escrow bucket 600 (created_at = pinned now).
    const months = summary.monthly_revenue;
    expect(months).toHaveLength(12);
    // First 11 months = 100 each, last month = 100 + 600 = 700
    expect(months.slice(0, 11)).toEqual(Array(11).fill(100));
    expect(months[11]).toBe(700);

    // quarterly growth: lastQ = months[9..11] = 100+100+700 = 900
    //                   prevQ = months[6..8]  = 100+100+100 = 300
    // growth = ((900-300)/300)*100 = 200
    expect(summary.quarterly_growth).toBe(200);

    // yearly projection: sum = 11*100 + 700 = 1800; /12 * 12 = 1800
    expect(summary.yearly_projection).toBe(1800);
  });

  it('computes tax obligations at 20% of taxable profit (rounded)', async () => {
    // calculateTaxObligations: income from paid invoices since tax-year start,
    // minus expenses since tax-year start. 20% rounded.
    // We isolate this by zeroing escrow and giving fixed invoice/expense rows.
    configureTables({
      invoices: {
        result: {
          data: [
            {
              total_amount: 1000,
              due_date: '2026-05-01T00:00:00Z',
              status: 'paid',
            },
          ],
          error: null,
        },
      },
      contractor_expenses: {
        result: { data: [{ amount: 100 }], error: null },
      },
      escrow_transactions: { result: { data: [], error: null } },
    });

    const summary = await getFinancialSummary('contractor-1');

    // PROBLEM: invoices query is shared across getMonthlyRevenue (12x),
    // getProfitTrends (6x), calculateTaxObligations (1x), cashflow (1x).
    // Tax uses ALL paid invoices since tax-year start as a single fetch:
    // income = 1000, expenses = 100 => taxableProfit = 900 => 20% = 180.
    expect(summary.tax_obligations).toBe(180);
  });

  it('clamps negative taxable profit to zero tax', async () => {
    configureTables({
      invoices: {
        result: {
          data: [
            {
              total_amount: 50,
              due_date: '2026-05-01T00:00:00Z',
              status: 'paid',
            },
          ],
          error: null,
        },
      },
      contractor_expenses: {
        result: { data: [{ amount: 5000 }], error: null },
      },
      escrow_transactions: { result: { data: [], error: null } },
    });

    const summary = await getFinancialSummary('contractor-1');
    // income 50 - expenses 5000 = -4950 -> Math.max(0, ...) = 0 -> tax 0
    expect(summary.tax_obligations).toBe(0);
  });

  it('builds an 8-week cash-flow forecast with averaged income/expenses', async () => {
    // generateCashFlowForecast: avgWeeklyIncome = round(totalIncome/12),
    // avgWeeklyExpenses = round(totalExpenses/12), plus pending invoices due
    // in each week. Pending = outstanding (sent/overdue) invoices.
    //
    // Give a pending invoice due 3 weeks out (within forecast window) so one
    // week gets the bump.
    const threeWeeksOut = new Date(PINNED_NOW);
    threeWeeksOut.setDate(threeWeeksOut.getDate() + 21);

    configureTables({
      invoices: {
        result: {
          data: [
            // paid (income) + outstanding(pending) both read from this set.
            {
              total_amount: 1200,
              due_date: threeWeeksOut.toISOString(),
              status: 'sent',
            },
          ],
          error: null,
        },
      },
      contractor_expenses: {
        result: { data: [{ amount: 600 }], error: null },
      },
      escrow_transactions: { result: { data: [], error: null } },
    });

    const summary = await getFinancialSummary('contractor-1');
    const forecast = summary.cash_flow_forecast;

    expect(forecast).toHaveLength(8);
    // avgWeeklyIncome = round(1200/12) = 100; avgWeeklyExpenses = round(600/12) = 50
    // Every week base income 100, expenses 50.
    // Pending invoice (1200) is due 21 days out -> falls in week index 3
    // (weekStart = now + 21d, weekEnd = +28d; due >= weekStart && due < weekEnd).
    forecast.forEach((wk, i) => {
      expect(wk.projected_expenses).toBe(50);
      if (i === 3) {
        expect(wk.projected_income).toBe(100 + 1200);
        expect(wk.net_flow).toBe(100 + 1200 - 50);
      } else {
        expect(wk.projected_income).toBe(100);
        expect(wk.net_flow).toBe(50);
      }
      // week is an ISO date (YYYY-MM-DD)
      expect(wk.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('treats per-month escrow buckets independently of contractor-escrow totals', async () => {
    // Sanity: escrow rows with created_at OUTSIDE the 12-month horizon are
    // dropped from monthly buckets (fetchReleasedEscrowByMonth gte filter is
    // applied by Supabase, which our mock honours by returning only what we
    // give it). Here we give an escrow row dated in the current month so it
    // lands in the final bucket; the contractor-escrow totals (no date
    // filter) also include it.
    configureTables({
      invoices: { result: { data: [], error: null } },
      contractor_expenses: { result: { data: [], error: null } },
      escrow_transactions: {
        result: {
          data: [
            {
              amount: 400,
              status: 'completed',
              created_at: PINNED_NOW.toISOString(),
            },
          ],
          error: null,
        },
      },
    });

    const summary = await getFinancialSummary('contractor-1');
    // monthly_revenue: only the last (current) month gets the 400 escrow bucket
    expect(summary.monthly_revenue[11]).toBe(400);
    expect(summary.monthly_revenue.slice(0, 11)).toEqual(Array(11).fill(0));
    // earned total includes it
    expect(summary.escrow_revenue).toBe(400);
    // in-flight is zero
    expect(summary.escrow_in_flight).toBe(0);
  });

  it('skips escrow rows without created_at and coerces string/null amounts in monthly buckets', async () => {
    // Targets fetchReleasedEscrowByMonth branches:
    //  - `if (!row.created_at) continue;` (skip path)
    //  - amount coercion: string -> Number, null -> 0
    configureTables({
      invoices: { result: { data: [], error: null } },
      contractor_expenses: { result: { data: [], error: null } },
      escrow_transactions: {
        result: {
          data: [
            // no created_at -> skipped from monthly buckets (but counted in totals)
            { amount: 111, status: 'released' },
            // string amount in current month bucket
            {
              amount: '250',
              status: 'released',
              created_at: PINNED_NOW.toISOString(),
            },
            // null amount in current month bucket -> contributes 0
            {
              amount: null,
              status: 'completed',
              created_at: PINNED_NOW.toISOString(),
            },
          ],
          error: null,
        },
      },
    });

    const summary = await getFinancialSummary('contractor-1');
    // Monthly bucket for current month = 250 (string coerced) + 0 (null) = 250.
    // The created_at-less row is skipped from buckets.
    expect(summary.monthly_revenue[11]).toBe(250);
    expect(summary.monthly_revenue.slice(0, 11)).toEqual(Array(11).fill(0));
    // Earned totals (no created_at filter): 111 + 250 + 0 = 361
    expect(summary.escrow_revenue).toBe(361);
  });

  it('computes the tax-year start in the previous calendar year for Jan-Mar dates', async () => {
    // Targets calculateTaxObligations cond-expr `now.getMonth() >= 3 ? ...`.
    // Pin to February 2026 (month index 1 < 3) so taxYearStart falls in 2025.
    jest.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

    configureTables({
      invoices: {
        result: {
          data: [
            {
              total_amount: 500,
              due_date: '2026-02-01T00:00:00Z',
              status: 'paid',
            },
          ],
          error: null,
        },
      },
      contractor_expenses: {
        result: { data: [{ amount: 100 }], error: null },
      },
      escrow_transactions: { result: { data: [], error: null } },
    });

    const summary = await getFinancialSummary('contractor-1');
    // taxableProfit = 500 - 100 = 400; 20% = 80
    expect(summary.tax_obligations).toBe(80);
  });
});
