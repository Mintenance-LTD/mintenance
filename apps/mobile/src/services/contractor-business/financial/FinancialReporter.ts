/**
 * FinancialReporter — pure read-side aggregations used by mobile
 * finance screens.
 *
 * 2026-04-30 audit P0-1 disposition: ALLOWED to keep direct supabase
 * reads. Rationale:
 *   1. Every query is read-only.
 *   2. Every query is scoped by `contractor_id = contractorId` AND the
 *      table has RLS policies that restrict rows to the calling user
 *      (live DB confirmed in 2026-04-23 audit: 99.7% RLS coverage).
 *   3. Building an aggregate API endpoint would be 18+ round-trips
 *      (12 monthly revenue + 6 profit trends + tax + cashflow) which
 *      is a substantial server-side refactor that should batch
 *      everything into a single SQL view. Out of scope for the
 *      P0-1 mutation-bypass remediation.
 *
 * If you migrate this in a follow-up: design `GET
 * /api/contractor/finance/summary?period=...` that returns the full
 * FinancialSummary in one call, ideally backed by a database view.
 */
import { supabase } from '../../../config/supabase';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { logger } from '../../../utils/logger';
import type { DatabaseInvoiceRow } from './types';
import type { FinancialSummary } from '../types';
import {
  fetchPaidInvoices,
  fetchExpenses,
  fetchExpenseCategories,
  fetchOutstandingInvoices,
  fetchContractorEscrow,
  type EscrowAmountRow,
} from './financialFetchers';

export function calculateDueDate(paymentTerms: string): string {
  const daysMap: Record<string, number> = {
    '30 days': 30,
    '14 days': 14,
    '7 days': 7,
    'net 30': 30,
    'net 14': 14,
    immediate: 0,
  };
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (daysMap[paymentTerms] ?? 30));
  return dueDate.toISOString();
}

export async function calculateFinancialTotals(
  contractorId: string,
  periodStart: string,
  periodEnd: string
): Promise<{
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  outstandingInvoices: number;
  overdueAmount: number;
}> {
  const context = {
    service: 'FinancialManagementService',
    method: 'calculateFinancialTotals',
    userId: contractorId,
    params: { contractorId, periodStart, periodEnd },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(
      contractorId,
      'Contractor ID',
      context
    );
    ServiceErrorHandler.validateRequired(periodStart, 'Period start', context);
    ServiceErrorHandler.validateRequired(periodEnd, 'Period end', context);

    const [typedPaid, typedExp, typedOut] = await Promise.all([
      fetchPaidInvoices(contractorId, periodStart, periodEnd),
      fetchExpenses(contractorId, periodStart, periodEnd),
      fetchOutstandingInvoices(contractorId),
    ]);

    const totalRevenue = typedPaid.reduce(
      (sum, inv) => sum + inv.total_amount,
      0
    );
    const totalExpenses = typedExp.reduce((sum, exp) => sum + exp.amount, 0);
    const outstanding = typedOut.reduce(
      (sum, inv) => sum + inv.total_amount,
      0
    );
    const overdue = typedOut
      .filter((inv) => new Date(inv.due_date) < new Date())
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    return {
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      outstandingInvoices: outstanding,
      overdueAmount: overdue,
    };
  }, context);

  if (!result.success || !result.data)
    throw new Error('Failed to calculate financial totals');
  return result.data;
}

async function getMonthlyRevenue(
  contractorId: string,
  months: number
): Promise<number[]> {
  // 2026-05-21 audit: per-month revenue used to read only from paid
  // invoices. Contractors using the escrow flow never accrued invoice
  // rows so the monthly chart was uniformly £0. Augment with released
  // escrow transactions, bucketed by released-month.
  const escrowByMonth = await fetchReleasedEscrowByMonth(contractorId, months);

  const results: number[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - i);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const invoices = await fetchPaidInvoices(
      contractorId,
      startDate.toISOString(),
      endDate.toISOString()
    );
    const invoiceSum = invoices.reduce(
      (sum, inv) => sum + (inv.total_amount || 0),
      0
    );
    const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
    const escrowSum = escrowByMonth.get(monthKey) ?? 0;
    results.push(invoiceSum + escrowSum);
  }
  return results;
}

// Sum released escrow rows by `${year}-${month}` of created_at.
// Schema has no released_at column; created_at is close enough for
// month-bucketing (release lag is hours, not month-boundary).
async function fetchReleasedEscrowByMonth(
  contractorId: string,
  months: number
): Promise<Map<string, number>> {
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() - (months - 1));
  horizon.setDate(1);
  horizon.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('escrow_transactions')
    .select('amount, created_at, status')
    .eq('payee_id', contractorId)
    .in('status', ['released', 'completed'])
    .gte('created_at', horizon.toISOString());

  if (error) {
    logger.error('Error fetching released escrow by month', error.message);
    return new Map();
  }

  const buckets = new Map<string, number>();
  for (const row of (data ?? []) as EscrowAmountRow[] &
    { created_at: string }[]) {
    if (!row.created_at) continue;
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const amount =
      typeof row.amount === 'number'
        ? row.amount
        : Number(row.amount ?? 0) || 0;
    buckets.set(key, (buckets.get(key) ?? 0) + amount);
  }
  return buckets;
}

function calculateQuarterlyGrowth(monthlyRevenue: number[]): number {
  if (monthlyRevenue.length < 6) return 0;
  const lastQ = monthlyRevenue.slice(-3).reduce((s, r) => s + r, 0);
  const prevQ = monthlyRevenue.slice(-6, -3).reduce((s, r) => s + r, 0);
  return prevQ > 0 ? ((lastQ - prevQ) / prevQ) * 100 : 0;
}

function projectYearlyRevenue(monthlyRevenue: number[]): number {
  return (
    (monthlyRevenue.reduce((s, r) => s + r, 0) / monthlyRevenue.length) * 12
  );
}

async function getInvoicesSummary(
  contractorId: string
): Promise<{ outstandingInvoices: number; overdueAmount: number }> {
  try {
    const typed = await fetchOutstandingInvoices(contractorId);
    return {
      outstandingInvoices: typed.reduce((s, inv) => s + inv.total_amount, 0),
      overdueAmount: typed
        .filter(
          (inv) => new Date(inv.due_date) < new Date() && inv.status !== 'paid'
        )
        .reduce((s, inv) => s + inv.total_amount, 0),
    };
  } catch {
    return { outstandingInvoices: 0, overdueAmount: 0 };
  }
}

async function getProfitTrends(contractorId: string, months: number) {
  const trends: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - i);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    const [invoiceData, expenseData] = await Promise.all([
      fetchPaidInvoices(contractorId, start, end),
      fetchExpenses(contractorId, start, end),
    ]);

    const revenue = invoiceData.reduce(
      (s, inv) => s + (inv.total_amount || 0),
      0
    );
    const expenses = expenseData.reduce((s, exp) => s + (exp.amount || 0), 0);

    trends.push({
      month: startDate.toISOString().substring(0, 7),
      revenue,
      expenses,
      profit: revenue - expenses,
    });
  }
  return trends;
}

async function calculateTaxObligations(contractorId: string): Promise<number> {
  // Calculate estimated tax from current tax year income (Apr-Mar UK tax year)
  const now = new Date();
  const taxYearStart = new Date(
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1,
    3,
    6
  );
  const [invoices, expenses] = await Promise.all([
    fetchPaidInvoices(contractorId, taxYearStart.toISOString()),
    fetchExpenses(contractorId, taxYearStart.toISOString()),
  ]);

  const totalIncome = invoices.reduce(
    (s, inv) => s + (inv.total_amount || 0),
    0
  );
  const totalExpensesAmt = expenses.reduce(
    (s, exp) => s + (exp.amount || 0),
    0
  );
  const taxableProfit = Math.max(0, totalIncome - totalExpensesAmt);

  // UK self-employed: ~20% basic rate estimate (simplified)
  return Math.round(taxableProfit * 0.2);
}

async function generateCashFlowForecast(contractorId: string, weeks: number) {
  // Base forecast on average weekly income/expenses from last 12 weeks
  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - 84); // 12 weeks

  const [paidInvoiceData, expenseData, pendingData] = await Promise.all([
    fetchPaidInvoices(contractorId, lookbackStart.toISOString()),
    fetchExpenses(contractorId, lookbackStart.toISOString()),
    fetchOutstandingInvoices(contractorId),
  ]);

  const totalIncome = paidInvoiceData.reduce(
    (s, inv) => s + (inv.total_amount || 0),
    0
  );
  const totalExpenses = expenseData.reduce(
    (s, exp) => s + (exp.amount || 0),
    0
  );
  const avgWeeklyIncome = Math.round(totalIncome / 12);
  const avgWeeklyExpenses = Math.round(totalExpenses / 12);

  // Map pending invoices to their due weeks
  const pendingInvoices = pendingData as Pick<
    DatabaseInvoiceRow,
    'total_amount' | 'due_date'
  >[];

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Add any pending invoices due this week to projected income
    const pendingThisWeek = pendingInvoices
      .filter((inv) => {
        const due = new Date(inv.due_date);
        return due >= weekStart && due < weekEnd;
      })
      .reduce((s, inv) => s + (inv.total_amount || 0), 0);

    const projectedIncome = avgWeeklyIncome + pendingThisWeek;
    const projectedExpenses = avgWeeklyExpenses;

    return {
      week: weekStart.toISOString().substring(0, 10),
      projectedIncome,
      projectedExpenses,
      netFlow: projectedIncome - projectedExpenses,
    };
  });
}

export async function getFinancialSummary(
  contractorId: string
): Promise<FinancialSummary> {
  const context = {
    service: 'FinancialManagementService',
    method: 'getFinancialSummary',
    userId: contractorId,
    params: { contractorId },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(
      contractorId,
      'Contractor ID',
      context
    );

    // Parallelize the five independent Supabase round-trips. Previously
    // these ran sequentially, so total latency was the SUM of every
    // query — producing the user-reported "this screen is very slow to
    // load". They have no data dependencies on each other; only the
    // two sync calculations below depend on monthlyRevenue.
    const [
      monthlyRevenue,
      invoicesSummary,
      profitTrends,
      taxObligations,
      cashFlowForecast,
      escrowTotals,
      expenseCategories,
    ] = await Promise.all([
      getMonthlyRevenue(contractorId, 12),
      getInvoicesSummary(contractorId),
      getProfitTrends(contractorId, 6),
      calculateTaxObligations(contractorId),
      generateCashFlowForecast(contractorId, 8),
      fetchContractorEscrow(contractorId),
      // 2026-07-20 fix: `total_expenses` / `expense_breakdown` were declared
      // on FinancialSummary but never produced by any code path, so the
      // dashboard's Expenses tile was pinned at £0 and ByCategoryBars never
      // rendered — regardless of how many expenses the contractor had logged.
      // Both fields are optional, so TypeScript never caught it.
      fetchExpenseCategories(contractorId),
    ]);

    const quarterlyGrowth = calculateQuarterlyGrowth(monthlyRevenue);
    const yearlyProjection = projectYearlyRevenue(monthlyRevenue);
    const { outstandingInvoices, overdueAmount } = invoicesSummary;

    const totalExpenses = expenseCategories.reduce(
      (sum, c) => sum + c.amount,
      0
    );
    const expenseBreakdown = expenseCategories.map((c) => ({
      category: c.category,
      amount: c.amount,
      percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
    }));

    return {
      monthly_revenue: monthlyRevenue,
      quarterly_growth: quarterlyGrowth,
      yearly_projection: yearlyProjection,
      // 2026-07-20 fix: this previously returned `outstandingInvoices +
      // escrowTotals.inFlight` so the headline total reflected real money
      // owed (invoices are often £0 because the escrow flow doesn't create
      // them). But `escrow_in_flight` is ALSO returned, and the dashboard
      // renders both as sibling tiles — so the same money appeared twice
      // ("In escrow £3.98" + "Outstanding £3.98" reading as £7.96).
      // The field now means what its name says: invoices only. Callers that
      // want the combined figure use `total_owed` below.
      outstanding_invoices: outstandingInvoices,
      /** Invoices + escrow still in flight — the true "owed to me" total. */
      total_owed: outstandingInvoices + escrowTotals.inFlight,
      overdue_amount: overdueAmount,
      profit_trends: profitTrends,
      tax_obligations: taxObligations,
      cash_flow_forecast: cashFlowForecast.map((f) => ({
        week: f.week,
        projected_income: f.projectedIncome,
        projected_expenses: f.projectedExpenses,
        net_flow: f.netFlow,
      })),
      escrow_in_flight: escrowTotals.inFlight,
      escrow_revenue: escrowTotals.earned,
      total_expenses: totalExpenses,
      expense_breakdown: expenseBreakdown,
    };
  }, context);

  if (!result.success || !result.data)
    throw new Error('Failed to get financial summary');
  return result.data;
}
