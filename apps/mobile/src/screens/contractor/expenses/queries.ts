import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { supabase } from '../../../config/supabase';
import type { Expense } from './types';

/**
 * React Query hooks for contractor expenses.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */

export function useExpensesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['contractor-expenses', userId],
    queryFn: async () => {
      if (!userId) return { expenses: [] as Expense[], total: 0 };
      const { data, error } = await supabase
        .from('contractor_expenses')
        .select('*')
        .eq('contractor_id', userId)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      const expenses: Expense[] = (data || []).map(
        (e: Record<string, unknown>) => ({
          id: e.id as string,
          description: (e.description as string) || '',
          category: (e.category as string) || 'other',
          amount: (e.amount as number) || 0,
          date: (e.date as string) || (e.created_at as string),
          billable: (e.billable ?? e.is_billable ?? false) as boolean,
          job_id: e.job_id as string | undefined,
        })
      );
      return {
        expenses,
        total: expenses.reduce((s, e) => s + e.amount, 0),
      };
    },
    enabled: !!userId,
  });
}

export interface CreateExpenseInput {
  description: string;
  category: string;
  amount: number;
  billable: boolean;
}

export function useCreateExpense(args: {
  userId: string | undefined;
  jobIdParam?: string;
  onSuccess: () => void;
  onError: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: CreateExpenseInput) => {
      if (!args.userId) throw new Error('Not authenticated');
      // 2026-05-02 audit follow-up: API contract is camelCase
      // `isBillable` (see `createExpenseSchema` in
      // apps/web/app/api/contractor/expenses/route.ts). The previous
      // `billable` key was silently dropped by Zod's default schema
      // mode and every job-scoped expense was saved with
      // `is_billable = false`.
      await mobileApiClient.post('/api/contractor/expenses', {
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        isBillable: expense.billable,
        date: new Date().toISOString(),
        // Pipes the job-scoped param through so contractor_expenses.job_id
        // is set when the form was opened from a job detail screen.
        jobId: args.jobIdParam,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-expenses'] });
      args.onSuccess();
    },
    onError: args.onError,
  });
}

export function useDeleteExpense(onError: (err: Error) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      // 2026-05-02 audit follow-up: backend exposes
      // `DELETE /api/contractor/expenses?id=…` (the id is parsed off
      // the query string in route.ts), NOT a path-segment style
      // `/expenses/:id`. The path-segment form 404'd silently and
      // expenses never deleted from the screen.
      await mobileApiClient.delete(
        `/api/contractor/expenses?id=${encodeURIComponent(expenseId)}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-expenses'] });
    },
    onError,
  });
}
