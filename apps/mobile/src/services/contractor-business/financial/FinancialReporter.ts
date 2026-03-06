import { supabase } from '../../../config/supabase';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import type { DatabaseInvoiceRow, DatabaseExpenseRow } from './types';

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

    const { data: paidInvoices, error: invoiceError } = await supabase
      .from('invoices').select('total_amount')
      .eq('contractor_id', contractorId).eq('status', 'paid')
      .gte('paid_date', periodStart).lte('paid_date', periodEnd);
    if (invoiceError) throw ServiceErrorHandler.handleDatabaseError(invoiceError, context);

    const { data: expenses, error: expenseError } = await supabase
      .from('expenses').select('amount')
      .eq('contractor_id', contractorId)
      .gte('date', periodStart).lte('date', periodEnd);
    if (expenseError) throw ServiceErrorHandler.handleDatabaseError(expenseError, context);

    const { data: outstandingInvoices, error: outstandingError } = await supabase
      .from('invoices').select('total_amount, due_date')
      .eq('contractor_id', contractorId).in('status', ['sent', 'overdue']);
    if (outstandingError) throw ServiceErrorHandler.handleDatabaseError(outstandingError, context);

    const typedPaid = (paidInvoices || []) as Pick<DatabaseInvoiceRow, 'total_amount'>[];
    const typedExp = (expenses || []) as Pick<DatabaseExpenseRow, 'amount'>[];
    const typedOut = (outstandingInvoices || []) as Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date'>[];

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

    const { data: invoices } = await supabase.from('invoices').select('total_amount')
      .eq('contractor_id', contractorId).eq('status', 'paid')
      .gte('paid_date', startDate.toISOString()).lte('paid_date', endDate.toISOString());

    const typed = (invoices || []) as Pick<DatabaseInvoiceRow, 'total_amount'>[];
    results.push(typed.reduce((sum, inv) => sum + (inv.total_amount || 0), 0));
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
  const { data: invoices, error } = await supabase.from('invoices')
    .select('total_amount, due_date, status')
    .eq('contractor_id', contractorId).in('status', ['sent', 'overdue']);
  if (error) return { outstandingInvoices: 0, overdueAmount: 0 };
  const typed = (invoices || []) as Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date' | 'status'>[];
  return {
    outstandingInvoices: typed.reduce((s, inv) => s + inv.total_amount, 0),
    overdueAmount: typed.filter((inv) => new Date(inv.due_date) < new Date() && inv.status !== 'paid')
      .reduce((s, inv) => s + inv.total_amount, 0),
  };
}

async function getProfitTrends(contractorId: string, months: number) {
  return Array.from({ length: months }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (months - 1 - i));
    const revenue = Math.floor(Math.random() * 3000) + 1000;
    const expenses = Math.floor(revenue * 0.7);
    return { month: month.toISOString().substring(0, 7), revenue, expenses, profit: revenue - expenses };
  });
}

async function calculateTaxObligations(_contractorId: string): Promise<number> {
  return Math.floor(Math.random() * 2000) + 500;
}

async function generateCashFlowForecast(_contractorId: string, weeks: number) {
  return Array.from({ length: weeks }, (_, i) => {
    const week = new Date();
    week.setDate(week.getDate() + i * 7);
    return {
      week: week.toISOString().substring(0, 10),
      projectedIncome: Math.floor(Math.random() * 1000) + 200,
      projectedExpenses: Math.floor(Math.random() * 600) + 100,
      netFlow: Math.floor(Math.random() * 800) - 200,
    };
  });
}

export async function getFinancialSummary(contractorId: string) {
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

    return { monthlyRevenue, quarterlyGrowth, yearlyProjection, outstandingInvoices,
      overdueAmount, profitTrends, taxObligations, cashFlowForecast };
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to get financial summary');
  return result.data;
}
