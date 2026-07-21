import { supabase } from '../../config/supabase';

interface MarketingStats {
  completedJobs: number;
  totalJobs: number;
  winRate: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  monthlyTrend: { month: string; count: number; earnings: number }[];
  categoryBreakdown: { category: string; count: number }[];
  ratingDistribution: Record<string, number>;
  recentReviews: {
    id: string;
    rating: number;
    comment: string;
    reviewer_name: string;
    created_at: string;
  }[];
}

export const EMPTY_STATS: MarketingStats = {
  completedJobs: 0,
  totalJobs: 0,
  winRate: 0,
  totalEarnings: 0,
  averageRating: 0,
  totalReviews: 0,
  monthlyTrend: [],
  categoryBreakdown: [],
  ratingDistribution: {},
  recentReviews: [],
};

export async function fetchReportingData(
  userId: string,
  days: number
): Promise<MarketingStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [jobsRes, bidsRes, reviewsRes, escrowRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, status, category, created_at')
      .eq('contractor_id', userId)
      .gte('created_at', sinceISO),
    supabase
      .from('bids')
      .select('id, status, job_id')
      .eq('contractor_id', userId)
      .gte('created_at', sinceISO),
    supabase
      .from('reviews')
      .select(
        'id, rating, comment, created_at, reviewer:profiles!reviewer_id(first_name, last_name)'
      )
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    // 2026-05-02 audit follow-up: escrow_transactions uses `payee_id`
    // (the contractor side of the escrow), NOT `contractor_id` — there
    // is no `contractor_id` column on this table. The web reporting
    // route at apps/web/app/api/contractor/reporting/route.ts:49
    // already uses `payee_id`. Filtering on the wrong column meant
    // the mobile reports screen always showed £0 earnings.
    supabase
      .from('escrow_transactions')
      .select('amount, status, created_at')
      .eq('payee_id', userId)
      .eq('status', 'released')
      .gte('created_at', sinceISO),
  ]);

  const jobs = jobsRes.data || [];
  const bids = bidsRes.data || [];
  const reviews = reviewsRes.data || [];
  const escrow = escrowRes.data || [];

  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const totalJobs = jobs.length;
  const acceptedBids = bids.filter((b) => b.status === 'accepted').length;
  const totalBids = bids.length;
  const winRate = totalBids > 0 ? acceptedBids / totalBids : 0;

  // 2026-05-22 audit C2: escrow_transactions.amount and reviews.rating
  // are Postgres NUMERIC columns. supabase-js returns NUMERIC as a
  // string to preserve precision; summing strings via `+=` silently
  // produces NaN / concatenation and the "Total Earnings" KPI showed
  // garbage. Coerce defensively before any arithmetic.
  const toNum = (v: unknown): number => {
    if (v == null) return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const totalEarnings = escrow.reduce((sum, e) => sum + toNum(e.amount), 0);

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + toNum(r.rating), 0) / totalReviews
      : 0;

  const ratingDistribution: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };
  reviews.forEach((r) => {
    const key = String(Math.round(r.rating || 0));
    if (ratingDistribution[key] !== undefined) ratingDistribution[key]++;
  });

  const monthMap: Record<string, { count: number; earnings: number }> = {};
  jobs.forEach((j) => {
    if (j.status === 'completed' && j.created_at) {
      const d = new Date(j.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { count: 0, earnings: 0 };
      monthMap[key].count++;
    }
  });
  escrow.forEach((e) => {
    if (e.created_at) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { count: 0, earnings: 0 };
      monthMap[key].earnings += e.amount || 0;
    }
  });
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, val]) => {
      const [, m] = key.split('-');
      return {
        month: monthNames[parseInt(m ?? '0', 10) - 1] ?? 'Unknown',
        count: val.count,
        earnings: val.earnings,
      };
    });

  const catMap: Record<string, number> = {};
  jobs
    .filter((j) => j.status === 'completed')
    .forEach((j) => {
      const cat = j.category || 'Other';
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    });
  const categoryBreakdown = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, count]) => ({ category, count }));

  const recentReviews = reviews.slice(0, 5).map((r) => {
    const reviewer = r.reviewer as {
      first_name?: string;
      last_name?: string;
    } | null;
    return {
      id: r.id,
      rating: r.rating || 0,
      comment: r.comment || '',
      reviewer_name: reviewer
        ? `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim()
        : 'Customer',
      created_at: r.created_at,
    };
  });

  return {
    completedJobs,
    totalJobs,
    winRate,
    totalEarnings,
    averageRating,
    totalReviews,
    monthlyTrend,
    categoryBreakdown,
    ratingDistribution,
    recentReviews,
  };
}
