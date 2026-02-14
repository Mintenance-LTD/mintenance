import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_req, { user }) => {
    const supabase = serverSupabase;
    const userId = user.id;

    // 6-month window for trend data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsISO = sixMonthsAgo.toISOString();

    const [
      profileResult,
      reviewsResult,
      reviewCountResult,
      bidsResult,
      jobsResult,
      earningsResult,
      messagesResult,
      postsResult,
    ] = await Promise.all([
      // Profile data
      supabase
        .from('profiles')
        .select('rating, total_jobs_completed, company_name, skills, first_name, last_name')
        .eq('id', userId)
        .single(),

      // Recent reviews (last 10)
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Total review count
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('reviewee_id', userId),

      // All bids (for win rate + monthly trend)
      supabase
        .from('bids')
        .select('id, status, amount, created_at')
        .eq('contractor_id', userId)
        .gte('created_at', sixMonthsISO),

      // Jobs assigned to this contractor (for category breakdown + monthly trend)
      supabase
        .from('jobs')
        .select('id, category, status, completed_at, created_at')
        .eq('contractor_id', userId),

      // Escrow earnings (released)
      supabase
        .from('escrow_transactions')
        .select('amount, updated_at')
        .eq('contractor_id', userId)
        .eq('status', 'released'),

      // Messages received (inquiries proxy)
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId),

      // Contractor posts
      supabase
        .from('contractor_posts')
        .select('id, title, created_at')
        .eq('contractor_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const profile = profileResult.data;
    const reviews = reviewsResult.data || [];
    const totalReviews = reviewCountResult.count || 0;
    const bids = bidsResult.data || [];
    const jobs = jobsResult.data || [];
    const earnings = earningsResult.data || [];
    const totalMessages = messagesResult.count || 0;
    const posts = postsResult.data || [];

    // Calculate bid stats
    const totalBids = bids.length;
    const acceptedBids = bids.filter(b => b.status === 'accepted').length;
    const winRate = totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0;

    // Calculate earnings
    const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate completed jobs
    const completedJobs = jobs.filter(j => j.status === 'completed').length;

    // Monthly trend (last 6 months)
    const monthlyTrend = buildMonthlyTrend(bids, jobs);

    // Category breakdown from all jobs
    const categoryBreakdown = buildCategoryBreakdown(jobs);

    // Rating distribution from reviews
    const ratingDistribution = buildRatingDistribution(reviews);

    return NextResponse.json({
      profile: {
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Contractor',
        companyName: profile?.company_name || null,
        rating: profile?.rating || 0,
        skills: profile?.skills || [],
      },
      stats: {
        completedJobs: profile?.total_jobs_completed || completedJobs,
        totalBids,
        acceptedBids,
        winRate,
        totalEarnings,
        totalReviews,
        averageRating: profile?.rating || 0,
        totalMessages,
        totalPosts: posts.length,
      },
      monthlyTrend,
      categoryBreakdown,
      ratingDistribution,
      recentReviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
      })),
      contractorId: userId,
    });
  }
);

interface BidRow { id: string; status: string; amount: number; created_at: string }
interface JobRow { id: string; category: string; status: string; completed_at: string | null; created_at: string }

function buildMonthlyTrend(bids: BidRow[], jobs: JobRow[]) {
  const months: { month: string; bidsSubmitted: number; bidsWon: number; jobsCompleted: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-GB', { month: 'short' });
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const monthBids = bids.filter(b => b.created_at?.startsWith(yearMonth));
    const monthBidsWon = monthBids.filter(b => b.status === 'accepted');
    const monthJobsDone = jobs.filter(j => j.completed_at?.startsWith(yearMonth));

    months.push({
      month: label,
      bidsSubmitted: monthBids.length,
      bidsWon: monthBidsWon.length,
      jobsCompleted: monthJobsDone.length,
    });
  }

  return months;
}

function buildCategoryBreakdown(jobs: JobRow[]) {
  const counts: Record<string, number> = {};
  for (const j of jobs) {
    const cat = j.category || 'Other';
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

function buildRatingDistribution(reviews: { rating: number }[]) {
  const dist = [0, 0, 0, 0, 0]; // index 0 = 1-star, index 4 = 5-star
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      dist[r.rating - 1]++;
    }
  }
  return dist.map((count, i) => ({ stars: i + 1, count }));
}
