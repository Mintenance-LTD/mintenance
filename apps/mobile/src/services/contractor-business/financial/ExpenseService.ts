/**
 * ExpenseService — facade methods invoked via FinancialManagementService.
 *
 * 2026-04-30 audit P0-1 follow-up: was inserting and reading directly
 * from a non-canonical `expenses` table. The web/admin surfaces use
 * `contractor_expenses` (live DB confirmed), exposed through
 * `/api/contractor/expenses`. This rewrite keeps the public function
 * signatures stable so callers don't break, but routes through the API
 * so RLS, role checks, and audit logs apply.
 *
 * Mapping notes:
 *   - The mobile `ExpenseRecord` type has a few fields the backend
 *     doesn't track explicitly (`subcategory`, `vendor`,
 *     `tax_deductible`). They're folded into the `notes` column on
 *     create and reconstructed best-effort on read.
 */
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import type { ExpenseRecord } from '../types';

interface CreateExpenseInput extends Omit<
  ExpenseRecord,
  'id' | 'created_at' | 'updated_at'
> {}

const ALLOWED_CATEGORIES = new Set([
  'materials',
  'tools',
  'fuel',
  'software',
  'insurance',
  'marketing',
  'other',
]);

function normalizeCategory(value: string | undefined | null): string {
  if (!value) return 'other';
  return ALLOWED_CATEGORIES.has(value) ? value : 'other';
}

interface ApiExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  jobId: string | null;
  paymentMethod: string;
  receiptUrl: string | null;
  tags: string[];
  isBillable: boolean;
  notes: string | null;
  createdAt: string;
}

// 2026-05-23 audit-23 P2: live `contractor_expenses` has no
// tax_deductible column — recordExpense persists the intent as a
// `tax-deductible` tag (see ALLOWED_TAGS below). The previous
// fromApi() hardcoded tax_deductible:false, so the create roundtrip
// looked fine but every subsequent read silently lost the flag.
// Category totals on the expenses screen then under-reported the
// tax-deductible bucket. Map the tag back to the boolean so totals
// match what the contractor entered.
const TAX_DEDUCTIBLE_TAG = 'tax-deductible';

function fromApi(e: ApiExpense, contractorId: string): ExpenseRecord {
  return {
    id: e.id,
    contractor_id: contractorId,
    category: e.category,
    amount: e.amount,
    description: e.description,
    date: e.date,
    receipt_url: e.receiptUrl ?? undefined,
    tax_deductible: Array.isArray(e.tags)
      ? e.tags.includes(TAX_DEDUCTIBLE_TAG)
      : false,
    created_at: e.createdAt,
    updated_at: e.createdAt,
  };
}

export async function recordExpense(
  expenseData: CreateExpenseInput
): Promise<ExpenseRecord> {
  const context = {
    service: 'FinancialManagementService',
    method: 'recordExpense',
    userId: expenseData.contractor_id,
    params: {
      category: expenseData.category,
      amount: expenseData.amount,
    },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(
      expenseData.contractor_id,
      'Contractor ID',
      context
    );
    ServiceErrorHandler.validateRequired(
      expenseData.category,
      'Category',
      context
    );
    ServiceErrorHandler.validatePositiveNumber(
      expenseData.amount,
      'Amount',
      context
    );
    ServiceErrorHandler.validateRequired(
      expenseData.description,
      'Description',
      context
    );

    // Pack the mobile-only fields (subcategory, vendor, tax_deductible)
    // into structured notes so we don't lose them. Anything explicitly
    // tax-deductible also gets a `tax-deductible` tag for filtering.
    const noteFragments: string[] = [];
    if (expenseData.subcategory) {
      noteFragments.push(`subcategory: ${expenseData.subcategory}`);
    }
    if (expenseData.vendor) noteFragments.push(`vendor: ${expenseData.vendor}`);
    const tags = expenseData.tax_deductible ? [TAX_DEDUCTIBLE_TAG] : [];

    const body = {
      description: expenseData.description,
      category: normalizeCategory(expenseData.category),
      amount: expenseData.amount,
      date: expenseData.date ?? new Date().toISOString().slice(0, 10),
      tags,
      notes: noteFragments.length > 0 ? noteFragments.join('; ') : undefined,
    };

    const response = await mobileApiClient.post<{ expense: ApiExpense }>(
      '/api/contractor/expenses',
      body
    );
    if (!response?.expense) {
      throw new Error('Expense creation returned no payload');
    }
    return fromApi(response.expense, expenseData.contractor_id);
  }, context);

  if (!result.success || !result.data)
    throw new Error('Failed to record expense');
  return result.data;
}

export async function getExpenses(
  contractorId: string,
  filters?: {
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    taxDeductible?: boolean;
  }
): Promise<ExpenseRecord[]> {
  const context = {
    service: 'FinancialManagementService',
    method: 'getExpenses',
    userId: contractorId,
    params: { contractorId, filters },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(
      contractorId,
      'Contractor ID',
      context
    );

    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.dateFrom) params.set('period_start', filters.dateFrom);
    if (filters?.dateTo) params.set('period_end', filters.dateTo);

    const qs = params.toString();
    const response = await mobileApiClient.get<{ expenses: ApiExpense[] }>(
      `/api/contractor/expenses${qs ? `?${qs}` : ''}`
    );
    return (response?.expenses ?? []).map((e) => fromApi(e, contractorId));
  }, context);

  if (!result.success) return [];
  return result.data || [];
}

export async function getExpenseCategories(contractorId: string): Promise<
  {
    category: string;
    totalAmount: number;
    count: number;
    taxDeductibleAmount: number;
  }[]
> {
  // Build categories from the same API source so the breakdown matches
  // what's shown on the expenses screen.
  const expenses = await getExpenses(contractorId);
  const categoryMap = new Map<
    string,
    { totalAmount: number; count: number; taxDeductibleAmount: number }
  >();

  for (const expense of expenses) {
    const existing = categoryMap.get(expense.category) ?? {
      totalAmount: 0,
      count: 0,
      taxDeductibleAmount: 0,
    };
    categoryMap.set(expense.category, {
      totalAmount: existing.totalAmount + expense.amount,
      count: existing.count + 1,
      taxDeductibleAmount:
        existing.taxDeductibleAmount +
        (expense.tax_deductible ? expense.amount : 0),
    });
  }

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));
}
