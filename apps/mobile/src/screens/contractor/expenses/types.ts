import { theme } from '../../../theme';

/**
 * Shared types + constants for the contractor Expenses screen.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a) when the screen
 * was split from an 823-line monolith.
 */

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  billable: boolean;
  job_id?: string;
}

export type CategoryFilter =
  | 'all'
  | 'materials'
  | 'tools'
  | 'fuel'
  | 'software'
  | 'insurance'
  | 'marketing'
  | 'other';

export const CATEGORY_COLORS: Record<string, string> = {
  materials: '#3B82F6',
  tools: '#8B5CF6',
  fuel: theme.colors.accent,
  software: '#3B82F6',
  insurance: theme.colors.primary,
  marketing: theme.colors.error,
  other: theme.colors.textSecondary,
};

export const CATEGORY_FILTERS: CategoryFilter[] = [
  'all',
  'materials',
  'tools',
  'fuel',
  'software',
  'insurance',
  'marketing',
  'other',
];

export const EXPENSE_CATEGORIES = CATEGORY_FILTERS.filter(
  (item) => item !== 'all'
) as Exclude<CategoryFilter, 'all'>[];
