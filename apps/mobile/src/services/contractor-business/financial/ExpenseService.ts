import { supabase } from '../../../config/supabase';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import type { ExpenseRecord } from '../types';
import type { DatabaseExpenseRow } from './types';

export async function recordExpense(
  expenseData: Omit<ExpenseRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<ExpenseRecord> {
  const context = {
    service: 'FinancialManagementService', method: 'recordExpense',
    userId: expenseData.contractor_id,
    params: { category: expenseData.category, amount: expenseData.amount },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(expenseData.contractor_id, 'Contractor ID', context);
    ServiceErrorHandler.validateRequired(expenseData.category, 'Category', context);
    ServiceErrorHandler.validatePositiveNumber(expenseData.amount, 'Amount', context);
    ServiceErrorHandler.validateRequired(expenseData.description, 'Description', context);

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expenseData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);
    return data as ExpenseRecord;
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to record expense');
  return result.data;
}

export async function getExpenses(
  contractorId: string,
  filters?: { category?: string; dateFrom?: string; dateTo?: string; taxDeductible?: boolean }
): Promise<ExpenseRecord[]> {
  const context = {
    service: 'FinancialManagementService', method: 'getExpenses',
    userId: contractorId, params: { contractorId, filters },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('date', { ascending: false });

    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('date', filters.dateTo);
    if (filters?.taxDeductible !== undefined) query = query.eq('tax_deductible', filters.taxDeductible);

    const { data, error } = await query;
    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);
    return data as ExpenseRecord[] || [];
  }, context);

  if (!result.success) return [];
  return result.data || [];
}

export async function getExpenseCategories(contractorId: string): Promise<{
  category: string;
  totalAmount: number;
  count: number;
  taxDeductibleAmount: number;
}[]> {
  const context = {
    service: 'FinancialManagementService', method: 'getExpenseCategories',
    userId: contractorId, params: { contractorId },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('category, amount, tax_deductible')
      .eq('contractor_id', contractorId);

    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);

    const categoryMap = new Map<string, { totalAmount: number; count: number; taxDeductibleAmount: number }>();
    const typedExpenses = (expenses || []) as Pick<DatabaseExpenseRow, 'category' | 'amount' | 'tax_deductible'>[];

    typedExpenses.forEach((expense) => {
      const existing = categoryMap.get(expense.category) || { totalAmount: 0, count: 0, taxDeductibleAmount: 0 };
      categoryMap.set(expense.category, {
        totalAmount: existing.totalAmount + expense.amount,
        count: existing.count + 1,
        taxDeductibleAmount: existing.taxDeductibleAmount + (expense.tax_deductible ? expense.amount : 0),
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({ category, ...data }));
  }, context);

  if (!result.success) return [];
  return result.data || [];
}
