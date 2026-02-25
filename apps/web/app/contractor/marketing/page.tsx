'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone,
  TrendingUp,
  Star,
  Share2,
  Copy,
  CheckCircle,
  Briefcase,
  Target,
  PoundSterling,
  MessageCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AreaChart, DonutChart, BarChart } from '@tremor/react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface MarketingStats {
  profile: {
    name: string;
    companyName: string | null;
    rating: number;
    skills: string[];
  };
  stats: {
    completedJobs: number;
    totalBids: number;
    acceptedBids: number;
    winRate: number;
    totalEarnings: number;
    totalReviews: number;
    averageRating: number;
    totalMessages: number;
    totalPosts: number;
  };
  monthlyTrend: { month: string; bidsSubmitted: number; bidsWon: number; jobsCompleted: number }[];
  categoryBreakdown: { category: string; value: number }[];
  ratingDistribution: { stars: number; count: number }[];
  recentReviews: { id: string; rating: number; comment: string | null; createdAt: string }[];
  contractorId: string;
}

export default function MarketingToolsPage() {
  const [data, setData] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/contractor/marketing-stats', { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marketing data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
        <p className="text-lg font-medium text-gray-700">Could not load marketing data</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const { stats, monthlyTrend, categoryBreakdown, ratingDistribution, recentReviews, contractorId } = data;

  // Remap camelCase keys to human-readable labels for chart legend
  const trendChartData = monthlyTrend.map(m => ({
    month: m.month,
    'Bids Submitted': m.bidsSubmitted,
    'Bids Won': m.bidsWon,
    'Jobs Completed': m.jobsCompleted,
  }));

  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://mintenance.com'}/contractors/${contractorId}`;

  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied to clipboard');
  };

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-white border border-gray-200 rounded-xl p-8 mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="w-8 h-8 text-teal-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketing & Performance</h1>
            <p className="text-gray-600 mt-1">
              Track your profile performance and grow your business
            </p>
          </div>
        </div>
      </MotionDiv>

      <div className="space-y-6">
        {/* Quick Stats */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            icon={<Briefcase className="w-6 h-6 text-teal-600" />}
            iconBg="bg-teal-100"
            label="Jobs Completed"
            value={stats.completedJobs}
          />
          <StatCard
            icon={<Star className="w-6 h-6 text-amber-600" />}
            iconBg="bg-amber-100"
            label="Average Rating"
            value={stats.averageRating > 0 ? `${Number(stats.averageRating).toFixed(1)} / 5` : 'No ratings'}
            sub={`${stats.totalReviews} review${stats.totalReviews !== 1 ? 's' : ''}`}
          />
          <StatCard
            icon={<Target className="w-6 h-6 text-blue-600" />}
            iconBg="bg-blue-100"
            label="Bid Win Rate"
            value={`${stats.winRate}%`}
            sub={`${stats.acceptedBids} won of ${stats.totalBids} bids`}
          />
          <StatCard
            icon={<PoundSterling className="w-6 h-6 text-emerald-600" />}
            iconBg="bg-emerald-100"
            label="Total Earned"
            value={`\u00A3${(stats.totalEarnings / 100).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`}
            sub="Escrow released"
          />
        </MotionDiv>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Activity Trend */}
          <MotionDiv
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Activity Trend (Last 6 Months)
            </h3>
            {trendChartData.some(m => m['Bids Submitted'] > 0 || m['Jobs Completed'] > 0) ? (
              <AreaChart
                data={trendChartData}
                index="month"
                categories={['Bids Submitted', 'Bids Won', 'Jobs Completed']}
                colors={['blue', 'emerald', 'amber']}
                valueFormatter={(v) => String(v)}
                className="h-72"
              />
            ) : (
              <EmptyState message="No activity data yet. Start bidding on jobs to see your trends!" />
            )}
          </MotionDiv>

          {/* Job Categories */}
          <MotionDiv
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Job Categories
            </h3>
            {categoryBreakdown.length > 0 ? (
              <DonutChart
                data={categoryBreakdown}
                category="value"
                index="category"
                valueFormatter={(v) => `${v} job${v !== 1 ? 's' : ''}`}
                colors={['teal', 'blue', 'amber', 'emerald', 'rose', 'violet']}
                className="h-72"
              />
            ) : (
              <EmptyState message="No jobs yet. Your category breakdown will appear here." />
            )}
          </MotionDiv>
        </div>

        {/* Reviews + Rating Distribution Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating Distribution */}
          <MotionDiv
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Rating Distribution
            </h3>
            {ratingDistribution.some(r => r.count > 0) ? (
              <BarChart
                data={ratingDistribution.map(r => ({ rating: `${r.stars} star`, 'Reviews': r.count }))}
                index="rating"
                categories={['Reviews']}
                colors={['amber']}
                valueFormatter={(v) => `${v} review${v !== 1 ? 's' : ''}`}
                className="h-56"
              />
            ) : (
              <EmptyState message="No reviews yet. Complete jobs to start collecting reviews!" />
            )}
          </MotionDiv>

          {/* Recent Reviews */}
          <MotionDiv
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-teal-600" />
              Recent Reviews
            </h3>
            {recentReviews.length > 0 ? (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {recentReviews.map((review) => (
                  <div key={review.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {review.comment || 'No comment'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No reviews yet. Deliver great work and ask customers for feedback!" />
            )}
          </MotionDiv>
        </div>

        {/* Profile Sharing */}
        <MotionDiv
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-teal-600" />
            Share Your Profile
          </h3>

          <div className="flex items-center gap-4">
            <input
              type="text"
              value={profileUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm"
            />
            <button
              onClick={handleCopyProfileLink}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share this link on social media, email, or business cards to attract new customers.
          </p>
        </MotionDiv>

        {/* Quick Engagement Stats */}
        <MotionDiv
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Engagement Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label="Total Bids" value={stats.totalBids} />
            <MiniStat label="Bids Won" value={stats.acceptedBids} />
            <MiniStat label="Messages" value={stats.totalMessages} />
            <MiniStat label="Posts" value={stats.totalPosts} />
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <MotionDiv
      variants={staggerItem}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${iconBg} rounded-lg`}>{icon}</div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </MotionDiv>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-56 text-gray-400">
      <CheckCircle className="w-10 h-10 mb-2 text-gray-300" />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
