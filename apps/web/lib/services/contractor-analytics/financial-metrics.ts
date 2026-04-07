import { serverSupabase } from '@/lib/api/supabaseServer';
import type { CompletedJobRow, TransactionRow } from './types';

export async function getFinancialMetrics(contractorId: string) {
  const { data: jobs, error: jobsError } = await serverSupabase
    .from('jobs')
    .select('id, budget, created_at, status')
    .eq('contractor_id', contractorId)
    .eq('status', 'completed')
    .returns<CompletedJobRow[]>();

  if (jobsError) throw jobsError;

  const jobRows = jobs ?? [];

  const { data: transactions, error: transError } = await serverSupabase
    .from('escrow_transactions')
    .select('amount, created_at, status')
    .eq('payee_id', contractorId)
    .eq('status', 'released')
    .returns<TransactionRow[]>();

  if (transError) throw transError;

  const transactionRows = transactions ?? [];
  const totalEarnings = transactionRows.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  const jobBudgetTotal = jobRows.reduce(
    (sum, job) => sum + (job.budget ?? 0),
    0
  );
  const averageJobValue =
    jobRows.length > 0 ? jobBudgetTotal / jobRows.length : 0;

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthEarnings = transactionRows
    .filter(
      (transaction) =>
        transaction.created_at && new Date(transaction.created_at) >= thisMonth
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const lastMonthEarnings = transactionRows
    .filter((transaction) => {
      if (!transaction.created_at) {
        return false;
      }
      const date = new Date(transaction.created_at);
      return date >= lastMonth && date < thisMonth;
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const { data: pendingTrans, error: pendingError } = await serverSupabase
    .from('escrow_transactions')
    .select('amount')
    .eq('payee_id', contractorId)
    .eq('status', 'held')
    .returns<TransactionRow[]>();

  if (pendingError) throw pendingError;

  const pendingRows = pendingTrans ?? [];
  const pendingPayments = pendingRows.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  return {
    totalEarnings,
    thisMonthEarnings,
    lastMonthEarnings,
    averageJobValue,
    pendingPayments,
  };
}
