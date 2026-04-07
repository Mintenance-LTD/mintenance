import { serverSupabase } from '@/lib/api/supabaseServer';
import type { MonthlyTrend, TransactionRow, ReviewRow } from './types';

export async function getTrendsData(contractorId: string) {
  const monthsBack = 12;
  const monthlyJobTrends: MonthlyTrend[] = [];
  const earningsTrends: MonthlyTrend[] = [];
  const ratingTrends: MonthlyTrend[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0);

    const { data: monthlyJobs } = await serverSupabase
      .from('jobs')
      .select('id')
      .eq('contractor_id', contractorId)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .returns<{ id: string }[]>();

    const monthlyJobRows = monthlyJobs ?? [];
    const jobCount = monthlyJobRows.length;
    const lastJobTrend = monthlyJobTrends[monthlyJobTrends.length - 1];
    const previousJobCount =
      i < monthsBack - 1 && lastJobTrend ? lastJobTrend.value : 0;
    const jobChange =
      previousJobCount > 0
        ? ((jobCount - previousJobCount) / previousJobCount) * 100
        : 0;

    monthlyJobTrends.push({
      month,
      year,
      value: jobCount,
      change: jobChange,
    });

    const { data: monthlyEarnings } = await serverSupabase
      .from('escrow_transactions')
      .select('amount')
      .eq('payee_id', contractorId)
      .eq('status', 'released')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .returns<TransactionRow[]>();

    const monthlyEarningRows = monthlyEarnings ?? [];
    const earnings = monthlyEarningRows.reduce(
      (sum: number, transaction: TransactionRow) => sum + transaction.amount,
      0
    );
    const lastEarningsTrend = earningsTrends[earningsTrends.length - 1];
    const previousEarnings =
      i < monthsBack - 1 && lastEarningsTrend ? lastEarningsTrend.value : 0;
    const earningsChange =
      previousEarnings > 0
        ? ((earnings - previousEarnings) / previousEarnings) * 100
        : 0;

    earningsTrends.push({
      month,
      year,
      value: earnings,
      change: earningsChange,
    });

    const { data: monthlyReviews } = await serverSupabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', contractorId)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .returns<ReviewRow[]>();

    const monthlyReviewRows = monthlyReviews ?? [];
    const avgRating =
      monthlyReviewRows.length > 0
        ? monthlyReviewRows.reduce(
            (sum: number, review: ReviewRow) => sum + review.rating,
            0
          ) / monthlyReviewRows.length
        : 0;
    const lastRatingTrend = ratingTrends[ratingTrends.length - 1];
    const previousRating =
      i < monthsBack - 1 && lastRatingTrend ? lastRatingTrend.value : 0;
    const ratingChange =
      previousRating > 0
        ? ((avgRating - previousRating) / previousRating) * 100
        : 0;

    ratingTrends.push({
      month,
      year,
      value: avgRating,
      change: ratingChange,
    });
  }

  return {
    monthlyJobTrends,
    earningsTrends,
    ratingTrends,
  };
}
