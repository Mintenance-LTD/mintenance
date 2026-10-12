import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';

/** The same report feeds the web dashboard and mobile app. */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const range = new URL(request.url).searchParams.get('range') || '30d';
    const days =
      ({ '7d': 7, '30d': 30, '90d': 90, '1y': 365 } as Record<string, number>)[
        range
      ] ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const results = await Promise.all([
      serverSupabase
        .from('jobs')
        .select('id, status, category, created_at, completed_at')
        .eq('contractor_id', user.id)
        .or(`created_at.gte.${since},completed_at.gte.${since}`),
      serverSupabase
        .from('bids')
        .select('id, status')
        .eq('contractor_id', user.id)
        .gte('created_at', since),
      serverSupabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('reviewee_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
      serverSupabase
        .from('escrow_transactions')
        .select('amount, contractor_payout, platform_fee, status, released_at')
        .eq('payee_id', user.id)
        .in('status', ['released', 'completed'])
        .gte('released_at', since),
    ]);
    // An unavailable data source must not look like an empty business.
    if (results.some((result) => result.error))
      throw new InternalServerError(
        'Could not load all report data. Please retry.'
      );
    const jobs = results[0].data ?? [];
    const bids = results[1].data ?? [];
    const reviews = results[2].data ?? [];
    const earnings = results[3].data ?? [];
    const completed = jobs.filter(
      (job) =>
        job.status === 'completed' &&
        job.completed_at &&
        job.completed_at >= since
    );
    const net = (row: (typeof earnings)[number]) =>
      Number(
        row.contractor_payout ??
          Number(row.amount) - Number(row.platform_fee ?? 0)
      );
    const monthMap = new Map<string, { count: number; earnings: number }>();
    const month = (date: string) => {
      const key = date.slice(0, 7);
      if (!monthMap.has(key)) monthMap.set(key, { count: 0, earnings: 0 });
      return monthMap.get(key)!;
    };
    completed.forEach((job) => {
      month(job.completed_at!).count++;
    });
    earnings.forEach((row) => {
      if (row.released_at) month(row.released_at).earnings += net(row);
    });
    const categories = new Map<string, number>();
    completed.forEach((job) =>
      categories.set(
        job.category || 'Other',
        (categories.get(job.category || 'Other') ?? 0) + 1
      )
    );
    const ratingDistribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    reviews.forEach((review) => {
      const key = String(Math.round(Number(review.rating)));
      if (key in ratingDistribution) ratingDistribution[key]++;
    });
    return NextResponse.json({
      completedJobs: completed.length,
      totalJobs: jobs.length,
      winRate: bids.length
        ? bids.filter((bid) => bid.status === 'accepted').length / bids.length
        : 0,
      totalEarnings:
        Math.round(earnings.reduce((sum, row) => sum + net(row), 0) * 100) /
        100,
      averageRating: reviews.length
        ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
          reviews.length
        : 0,
      totalReviews: reviews.length,
      monthlyTrend: [...monthMap]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({
          month: new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-GB', {
            month: 'short',
            year: '2-digit',
          }),
          ...value,
        })),
      categoryBreakdown: [...categories]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      ratingDistribution,
      recentReviews: reviews
        .slice(0, 10)
        .map((review) => ({
          ...review,
          comment: review.comment || '',
          reviewer_name: 'Customer',
        })),
    });
  }
);
