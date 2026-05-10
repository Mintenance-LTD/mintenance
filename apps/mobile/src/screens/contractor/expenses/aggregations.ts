import type { Expense } from './types';

/**
 * Sum totals for the stats row. Pure — easy to unit-test.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */
export function computeExpenseStats(expenses: Expense[]): {
  totalExpenses: number;
  thisMonth: number;
  billableTotal: number;
} {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const now = new Date();
  const thisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, e) => sum + e.amount, 0);
  const billableTotal = expenses
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.amount, 0);
  return { totalExpenses, thisMonth, billableTotal };
}
