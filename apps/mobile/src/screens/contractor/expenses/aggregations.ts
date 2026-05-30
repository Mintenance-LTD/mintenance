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

/**
 * Sum the *current-calendar-month* spend by category — feeds the
 * 4-tile breakdown on the redesigned Expenses screen (Materials /
 * Fuel & van / Tools / Subs-fees combined). Returns an empty object
 * when there is no spend so callers don't need a null branch.
 */
export function computeCategoryTotalsThisMonth(
  expenses: Expense[]
): Record<string, number> {
  const now = new Date();
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (
      d.getMonth() !== now.getMonth() ||
      d.getFullYear() !== now.getFullYear()
    ) {
      return;
    }
    const key = (e.category || 'other').toLowerCase();
    totals[key] = (totals[key] ?? 0) + e.amount;
  });
  return totals;
}

/**
 * Count expenses logged this calendar month — used by the hero card
 * sub-line ("12 receipts · auto-categorised").
 */
export function countExpensesThisMonth(expenses: Expense[]): number {
  const now = new Date();
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;
}
