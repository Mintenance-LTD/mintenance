import { supabase } from '../../config/supabase';
import { theme } from '../../theme';

interface MarketingStats {
  completedJobs: number;
  totalJobs: number;
  winRate: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  monthlyTrend: Array<{ month: string; count: number; earnings: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  ratingDistribution: Record<string, number>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string;
    reviewer_name: string;
    created_at: string;
  }>;
}

export const DATE_RANGES = [
  { key: '7d' as const, label: '7 days', days: 7 },
  { key: '30d' as const, label: '30 days', days: 30 },
  { key: '90d' as const, label: '90 days', days: 90 },
  { key: '1y' as const, label: 'This year', days: 365 },
];

export const KPI_CONFIG = [
  {
    key: 'jobs',
    icon: 'checkmark-circle-outline' as const,
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
    label: 'Jobs Done',
  },
  {
    key: 'winRate',
    icon: 'trending-up-outline' as const,
    color: '#3B82F6',
    bg: '#DBEAFE',
    label: 'Win Rate',
  },
  {
    key: 'earnings',
    icon: 'cash-outline' as const,
    color: theme.colors.accent,
    bg: theme.colors.accentLight,
    label: 'Earnings',
  },
  {
    key: 'rating',
    icon: 'star-outline' as const,
    color: '#8B5CF6',
    bg: '#EDE9FE',
    label: 'Avg Rating',
  },
];

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
    supabase
      .from('escrow_transactions')
      .select('amount, status, created_at')
      .eq('contractor_id', userId)
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
  const totalEarnings = escrow.reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
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
