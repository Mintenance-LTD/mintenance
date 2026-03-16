/**
 * GET /api/contractor/reporting
 * Aggregated reporting data for the contractor dashboard
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '30d';

    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[range] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const [profileRes, reviewsRes, reviewCountRes, bidsRes, jobsRes, earningsRes] = await Promise.all([
        serverSupabase
          .from('profiles')
          .select('rating, total_jobs_completed')
          .eq('id', user.id)
          .single(),
        serverSupabase
          .from('reviews')
          .select('id, rating, comment, created_at, reviewer_id')
          .eq('reviewee_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        serverSupabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('reviewee_id', user.id),
        serverSupabase
          .from('bids')
          .select('id, status, amount, created_at')
          .eq('contractor_id', user.id)
          .gte('created_at', since),
        serverSupabase
          .from('jobs')
          .select('id, category, status, completed_at, created_at')
          .eq('contractor_id', user.id)
          .gte('created_at', since)
          .limit(200),
        serverSupabase
          .from('escrow_transactions')
          .select('amount')
          .eq('payee_id', user.id)
          .eq('status', 'released')
          .limit(500),
      ]);

      const profile = profileRes.data;
      const reviews = reviewsRes.data || [];
      const totalReviews = reviewCountRes.count || 0;
      const bids = bidsRes.data || [];
      const jobs = jobsRes.data || [];
      const earnings = earningsRes.data || [];

      // Calculate metrics
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const acceptedBids = bids.filter(b => b.status === 'accepted').length;
      const winRate = bids.length > 0 ? acceptedBids / bids.length : 0;
      const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      // Monthly trend (last 6 months)
      const monthlyTrend: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
        const count = jobs.filter(j => {
          const jd = new Date(j.created_at);
          return jd.getMonth() === d.getMonth() && jd.getFullYear() === d.getFullYear();
        }).length;
        monthlyTrend.push({ month, count });
      }

      // Category breakdown
      const catMap = new Map<string, number>();
      for (const j of jobs) {
        const cat = j.category || 'general';
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
      }
      const categoryBreakdown = Array.from(catMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Rating distribution
      const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      for (const r of reviews) {
        const key = String(r.rating);
        if (key in ratingDistribution) ratingDistribution[key]++;
      }

      return NextResponse.json({
        completedJobs,
        winRate: Math.round(winRate * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        averageRating: profile?.rating || 0,
        totalReviews,
        monthlyTrend,
        categoryBreakdown,
        ratingDistribution,
        recentReviews: reviews.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment || '',
          created_at: r.created_at,
        })),
      });
    } catch (err) {
      logger.error('Failed to generate reporting data', err, {
        service: 'contractor-reporting',
        userId: user.id,
      });
      throw new InternalServerError('Failed to generate report');
    }
  }
);
