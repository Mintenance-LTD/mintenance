/**
 * Low-level Supabase reads backing the contractor financial summary.
 *
 * Split out of FinancialReporter.ts on 2026-07-20: adding the expense
 * category query pushed that file past the 500-line pre-commit gate, and
 * these five functions are a cohesive layer — each is a single table read
 * that coerces its rows and degrades to an empty result on error, with no
 * aggregation logic. FinancialReporter keeps the maths.
 *
 * They read Supabase directly (not mobileApiClient) so the financial summary
 * has no HTTP dependency and stays testable with a single supabase mock.
 */
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';
import type { DatabaseInvoiceRow, DatabaseExpenseRow } from './types';

/** Fetch paid invoices for a contractor in a date range via direct Supabase query. */
export async function fetchPaidInvoices(
  contractorId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<Pick<DatabaseInvoiceRow, 'total_amount'>[]> {
  let query = supabase
    .from('invoices')
    .select('total_amount')
    .eq('contractor_id', contractorId)
    .eq('status', 'paid');
  if (periodStart) query = query.gte('created_at', periodStart);
  if (periodEnd) query = query.lte('created_at', periodEnd);
  const { data, error } = await query;
  if (error) {
    logger.error('Error fetching paid invoices', error.message);
    return [];
  }
  return (data ?? []) as Pick<DatabaseInvoiceRow, 'total_amount'>[];
}

/** Fetch expenses for a contractor in a date range via direct Supabase query. */
export async function fetchExpenses(
  contractorId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<Pick<DatabaseExpenseRow, 'amount'>[]> {
  let query = supabase
    .from('contractor_expenses')
    .select('amount')
    .eq('contractor_id', contractorId);
  if (periodStart) query = query.gte('created_at', periodStart);
  if (periodEnd) query = query.lte('created_at', periodEnd);
  const { data, error } = await query;
  if (error) {
    logger.error('Error fetching expenses', error.message);
    return [];
  }
  return (data ?? []) as Pick<DatabaseExpenseRow, 'amount'>[];
}

/**
 * Expenses grouped by category, for the dashboard's Expenses tile and the
 * by-category bars (2026-07-20).
 *
 * Deliberately a direct Supabase query rather than reusing
 * ExpenseService.getExpenseCategories: that path goes through
 * `mobileApiClient` (HTTP), which would couple the whole financial summary
 * to the expenses endpoint being reachable — and to an HTTP mock in every
 * test of this module. Every other fetch in this file reads Supabase
 * directly; this now matches.
 */
export async function fetchExpenseCategories(
  contractorId: string
): Promise<{ category: string; amount: number }[]> {
  const { data, error } = await supabase
    .from('contractor_expenses')
    .select('amount, category')
    .eq('contractor_id', contractorId);
  if (error) {
    logger.error('Error fetching expense categories', error.message);
    return [];
  }
  const totals = new Map<string, number>();
  for (const row of (data ?? []) as {
    amount: number | string | null;
    category: string | null;
  }[]) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    const category = row.category || 'Uncategorised';
    totals.set(category, (totals.get(category) ?? 0) + amount);
  }
  return Array.from(totals, ([category, amount]) => ({ category, amount }));
}

/** Fetch outstanding (sent/overdue) invoices via direct Supabase query. */
export async function fetchOutstandingInvoices(
  contractorId: string
): Promise<Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date' | 'status'>[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('total_amount, due_date, status')
    .eq('contractor_id', contractorId)
    .in('status', ['sent', 'overdue']);
  if (error) {
    logger.error('Error fetching outstanding invoices', error.message);
    return [];
  }
  return (data ?? []) as Pick<
    DatabaseInvoiceRow,
    'total_amount' | 'due_date' | 'status'
  >[];
}

// 2026-05-21 audit: escrow release doesn't insert into `invoices`, so
// the dashboard read £0 across every KPI. Read escrow_transactions
// scoped by payee_id; split into in-flight and earned.
export type EscrowAmountRow = {
  amount: number | string | null;
  status: string | null;
};
export async function fetchContractorEscrow(
  contractorId: string
): Promise<{ inFlight: number; earned: number }> {
  const { data, error } = await supabase
    .from('escrow_transactions')
    .select('amount, status')
    .eq('payee_id', contractorId);
  if (error) {
    logger.error('Error fetching contractor escrow', error.message);
    return { inFlight: 0, earned: 0 };
  }
  const rows = (data ?? []) as EscrowAmountRow[];
  const toNumber = (raw: EscrowAmountRow['amount']): number => {
    if (raw === null || raw === undefined) return 0;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const sumByStatus = (statuses: readonly string[]) =>
    rows
      .filter((r) => r.status !== null && statuses.includes(r.status))
      .reduce((sum, r) => sum + toNumber(r.amount), 0);
  return {
    inFlight: sumByStatus(['pending', 'held', 'release_pending']),
    earned: sumByStatus(['released', 'completed']),
  };
}
