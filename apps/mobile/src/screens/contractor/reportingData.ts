import { mobileApiClient } from '../../utils/mobileApiClient';

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
  _userId: string,
  days: number
): Promise<MarketingStats> {
  const range =
    days === 7 ? '7d' : days === 90 ? '90d' : days === 365 ? '1y' : '30d';
  return mobileApiClient.get<MarketingStats>(
    `/api/contractor/reporting?range=${range}`
  );
}
