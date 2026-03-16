import { mobileApiClient } from '../../../utils/mobileApiClient';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import type { DatabaseInvoiceRow, DatabaseExpenseRow } from './types';
import type { FinancialSummary } from '../types';

export function calculateDueDate(paymentTerms: string): string {
  const daysMap: Record<string, number> = {
    '30 days': 30, '14 days': 14, '7 days': 7,
    'net 30': 30, 'net 14': 14, 'immediate': 0,
  };
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (daysMap[paymentTerms] ?? 30));
  return dueDate.toISOString();
}

export async function calculateFinancialTotals(
  contractorId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ totalRevenue: number; totalExpenses: number; totalProfit: number; outstandingInvoices: number; overdueAmount: number }> {
  const context = {
    service: 'FinancialManagementService', method: 'calculateFinancialTotals',
    userId: contractorId, params: { contractorId, periodStart, periodEnd },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
    ServiceErrorHandler.validateRequired(periodStart, 'Period start', context);
    ServiceErrorHandler.validateRequired(periodEnd, 'Period end', context);

    const paidInvoices = await mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount'>[]>(
      `/api/contractor/invoices?status=paid&period_start=${periodStart}&period_end=${periodEnd}`
    );

    const expenses = await mobileApiClient.get<Pick<DatabaseExpenseRow, 'amount'>[]>(
      `/api/contractor/expenses?period_start=${periodStart}&period_end=${periodEnd}`
    );

    const outstandingInvoices = await mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date'>[]>(
      `/api/contractor/invoices?status=sent,overdue`
    );

    const typedPaid = paidInvoices || [];
    const typedExp = expenses || [];
    const typedOut = outstandingInvoices || [];

    const totalRevenue = typedPaid.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalExpenses = typedExp.reduce((sum, exp) => sum + exp.amount, 0);
    const outstanding = typedOut.reduce((sum, inv) => sum + inv.total_amount, 0);
    const overdue = typedOut
      .filter((inv) => new Date(inv.due_date) < new Date())
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    return { totalRevenue, totalExpenses, totalProfit: totalRevenue - totalExpenses,
      outstandingInvoices: outstanding, overdueAmount: overdue };
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to calculate financial totals');
  return result.data;
}

async function getMonthlyRevenue(contractorId: string, months: number): Promise<number[]> {
  const results: number[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - i);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const invoices = await mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount'>[]>(
      `/api/contractor/invoices?status=paid&period_start=${startDate.toISOString()}&period_end=${endDate.toISOString()}`
    );

    results.push((invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0));
  }
  return results;
}

function calculateQuarterlyGrowth(monthlyRevenue: number[]): number {
  if (monthlyRevenue.length < 6) return 0;
  const lastQ = monthlyRevenue.slice(-3).reduce((s, r) => s + r, 0);
  const prevQ = monthlyRevenue.slice(-6, -3).reduce((s, r) => s + r, 0);
  return prevQ > 0 ? ((lastQ - prevQ) / prevQ) * 100 : 0;
}

function projectYearlyRevenue(monthlyRevenue: number[]): number {
  return (monthlyRevenue.reduce((s, r) => s + r, 0) / monthlyRevenue.length) * 12;
}

async function getInvoicesSummary(contractorId: string): Promise<{ outstandingInvoices: number; overdueAmount: number }> {
  let typed: Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date' | 'status'>[];
  try {
    typed = await mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date' | 'status'>[]>(
      `/api/contractor/invoices?status=sent,overdue`
    ) || [];
  } catch {
    return { outstandingInvoices: 0, overdueAmount: 0 };
  }
  return {
    outstandingInvoices: typed.reduce((s, inv) => s + inv.total_amount, 0),
    overdueAmount: typed.filter((inv) => new Date(inv.due_date) < new Date() && inv.status !== 'paid')
      .reduce((s, inv) => s + inv.total_amount, 0),
  };
}

async function getProfitTrends(contractorId: string, months: number) {
  const trends: { month: string; revenue: number; expenses: number; profit: number }[] = [];
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
      mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount'>[]>(
        `/api/contractor/invoices?status=paid&period_start=${start}&period_end=${end}`
      ),
      mobileApiClient.get<Pick<DatabaseExpenseRow, 'amount'>[]>(
        `/api/contractor/expenses?period_start=${start}&period_end=${end}`
      ),
    ]);

    const revenue = (invoiceData || [])
      .reduce((s, inv) => s + (inv.total_amount || 0), 0);
    const expenses = (expenseData || [])
      .reduce((s, exp) => s + (exp.amount || 0), 0);

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
  const taxYearStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 6);
  const [invoices, expenses] = await Promise.all([
    mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount'>[]>(
      `/api/contractor/invoices?status=paid&period_start=${taxYearStart.toISOString()}`
    ),
    mobileApiClient.get<Pick<DatabaseExpenseRow, 'amount'>[]>(
      `/api/contractor/expenses?period_start=${taxYearStart.toISOString()}`
    ),
  ]);

  const totalIncome = (invoices || [])
    .reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const totalExpenses = (expenses || [])
    .reduce((s, exp) => s + (exp.amount || 0), 0);
  const taxableProfit = Math.max(0, totalIncome - totalExpenses);

  // UK self-employed: ~20% basic rate estimate (simplified)
  return Math.round(taxableProfit * 0.2);
}

async function generateCashFlowForecast(contractorId: string, weeks: number) {
  // Base forecast on average weekly income/expenses from last 12 weeks
  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - 84); // 12 weeks

  const [paidInvoiceData, expenseData, pendingData] = await Promise.all([
    mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount'>[]>(
      `/api/contractor/invoices?status=paid&period_start=${lookbackStart.toISOString()}`
    ),
    mobileApiClient.get<Pick<DatabaseExpenseRow, 'amount'>[]>(
      `/api/contractor/expenses?period_start=${lookbackStart.toISOString()}`
    ),
    mobileApiClient.get<Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date'>[]>(
      `/api/contractor/invoices?status=sent,overdue`
    ),
  ]);

  const totalIncome = (paidInvoiceData || [])
    .reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const totalExpenses = (expenseData || [])
    .reduce((s, exp) => s + (exp.amount || 0), 0);
  const avgWeeklyIncome = Math.round(totalIncome / 12);
  const avgWeeklyExpenses = Math.round(totalExpenses / 12);

  // Map pending invoices to their due weeks
  const pendingInvoices = pendingData || [];

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

export async function getFinancialSummary(contractorId: string): Promise<FinancialSummary> {
  const context = {
    service: 'FinancialManagementService', method: 'getFinancialSummary',
    userId: contractorId, params: { contractorId },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

    const monthlyRevenue = await getMonthlyRevenue(contractorId, 12);
    const quarterlyGrowth = calculateQuarterlyGrowth(monthlyRevenue);
    const yearlyProjection = projectYearlyRevenue(monthlyRevenue);
    const { outstandingInvoices, overdueAmount } = await getInvoicesSummary(contractorId);
    const profitTrends = await getProfitTrends(contractorId, 6);
    const taxObligations = await calculateTaxObligations(contractorId);
    const cashFlowForecast = await generateCashFlowForecast(contractorId, 8);

    return {
      monthly_revenue: monthlyRevenue,
      quarterly_growth: quarterlyGrowth,
      yearly_projection: yearlyProjection,
      outstanding_invoices: outstandingInvoices,
      overdue_amount: overdueAmount,
      profit_trends: profitTrends,
      tax_obligations: taxObligations,
      cash_flow_forecast: cashFlowForecast.map((f) => ({
        week: f.week,
        projected_income: f.projectedIncome,
        projected_expenses: f.projectedExpenses,
        net_flow: f.netFlow,
      })),
    };
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to get financial summary');
  return result.data;
}
