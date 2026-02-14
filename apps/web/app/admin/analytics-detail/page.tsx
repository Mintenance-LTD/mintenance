'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Download,
  BarChart3,
  PieChart,
  Loader2,
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';

const AreaChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.AreaChart })), {
  loading: () => <ChartSkeleton height="288px" />,
  ssr: false,
});

const DonutChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.DonutChart })), {
  loading: () => <ChartSkeleton height="288px" />,
  ssr: false,
});

const BarChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.BarChart })), {
  loading: () => <ChartSkeleton height="288px" />,
  ssr: false,
});

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

interface DashboardMetrics {
  totalUsers: number;
  totalContractors: number;
  totalJobs: number;
  activeSubscriptions: number;
  mrr: number;
  pendingVerifications: number;
  charts?: {
    userGrowth: Array<{ date: string; users: number; cumulative: number }>;
    jobGrowth: Array<{ date: string; jobs: number; cumulative: number }>;
  };
}

interface RevenueData {
  revenueMetrics: {
    totalRevenue: number;
    platformFees: number;
    subscriptionRevenue: number;
    avgJobValue: number;
  };
  monthlyRevenue: Array<{ month: string; revenue: number; fees: number; subscriptions: number }>;
  revenueByCategory: Array<{ category: string; count: number; revenue: number }>;
  recentTransactions: Array<{ id: string; type: string; amount: number; created_at: string; description?: string }>;
}

export default function AnalyticsDetailPage() {
  const [dateRange, setDateRange] = useState('30days');

  const daysMap: Record<string, number> = {
    '7days': 7,
    '30days': 30,
    '90days': 90,
    '1year': 365,
  };

  const days = daysMap[dateRange] || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['admin-analytics-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery<RevenueData>({
    queryKey: ['admin-analytics-revenue', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch revenue');
      return res.json();
    },
    staleTime: 60_000,
  });

  const isLoading = metricsLoading || revenueLoading;

  const totalUsers = metrics?.totalUsers ?? 0;
  const monthlyRevenue = revenue?.revenueMetrics?.totalRevenue ?? 0;
  const totalJobs = metrics?.totalJobs ?? 0;
  const avgJobValue = revenue?.revenueMetrics?.avgJobValue ?? 0;

  const platformMetrics = [
    {
      label: 'Total Users',
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Revenue (Period)',
      value: `\u00A3${(monthlyRevenue / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: 'Total Jobs',
      value: totalJobs.toLocaleString(),
      icon: Activity,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
    {
      label: 'Avg Job Value',
      value: `\u00A3${(avgJobValue / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  const userGrowthData = metrics?.charts?.userGrowth ?? [];
  const jobGrowthData = metrics?.charts?.jobGrowth ?? [];

  const revenueTrend = (revenue?.monthlyRevenue ?? []).map((m) => ({
    month: m.month,
    revenue: m.revenue / 100,
    fees: m.fees / 100,
    subscriptions: m.subscriptions / 100,
  }));

  const categoryData = (revenue?.revenueByCategory ?? []).map((c) => ({
    category: c.category || 'Other',
    count: c.count,
  }));

  const recentActivity = (revenue?.recentTransactions ?? []).slice(0, 5).map((tx) => ({
    action: tx.description || tx.type,
    time: new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    type: tx.type,
    amount: tx.amount,
  }));

  const handleExport = () => {
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Users', String(totalUsers)],
      ['Total Jobs', String(totalJobs)],
      ['Revenue', String(monthlyRevenue / 100)],
      ['Avg Job Value', String(avgJobValue / 100)],
    ];
    const csv = csvRows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Advanced Analytics</h1>
              <p className="text-slate-300">
                Detailed insights into platform performance and user behavior
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={dateRange}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateRange(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last Year</option>
              </select>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-slate-600">Loading analytics data...</span>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <MotionDiv
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              {platformMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <MotionDiv
                    key={index}
                    variants={staggerItem}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 ${metric.bgColor} rounded-lg`}>
                        <Icon className={`w-6 h-6 ${metric.color}`} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  </MotionDiv>
                );
              })}
            </MotionDiv>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* User Growth */}
              <MotionDiv
                variants={fadeIn}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  User Growth Trend
                </h3>
                {userGrowthData.length > 0 ? (
                  <AreaChart
                    data={userGrowthData}
                    index="date"
                    categories={['cumulative']}
                    colors={['emerald']}
                    valueFormatter={(value) => value.toLocaleString()}
                    className="h-72"
                  />
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-gray-400">
                    No user growth data available yet
                  </div>
                )}
              </MotionDiv>

              {/* Revenue Breakdown */}
              <MotionDiv
                variants={fadeIn}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Revenue Breakdown
                </h3>
                {revenueTrend.length > 0 ? (
                  <AreaChart
                    data={revenueTrend}
                    index="month"
                    categories={['revenue', 'fees', 'subscriptions']}
                    colors={['emerald', 'blue', 'amber']}
                    valueFormatter={(value) => `\u00A3${value.toLocaleString()}`}
                    className="h-72"
                  />
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-gray-400">
                    No revenue data available yet
                  </div>
                )}
              </MotionDiv>

              {/* Job Categories */}
              <MotionDiv
                variants={fadeIn}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Job Distribution by Category
                </h3>
                {categoryData.length > 0 ? (
                  <DonutChart
                    data={categoryData}
                    category="count"
                    index="category"
                    valueFormatter={(value) => `${value} jobs`}
                    colors={['emerald', 'blue', 'amber', 'cyan', 'slate', 'rose']}
                    className="h-72"
                  />
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-gray-400">
                    No category data available yet
                  </div>
                )}
              </MotionDiv>

              {/* Job Growth */}
              <MotionDiv
                variants={fadeIn}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  Job Creation Trend
                </h3>
                {jobGrowthData.length > 0 ? (
                  <BarChart
                    data={jobGrowthData}
                    index="date"
                    categories={['jobs']}
                    colors={['emerald']}
                    valueFormatter={(value) => `${value} jobs`}
                    className="h-72"
                  />
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-gray-400">
                    No job creation data available yet
                  </div>
                )}
              </MotionDiv>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Summary */}
              <MotionDiv
                variants={fadeIn}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Summary</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Contractors', value: metrics?.totalContractors?.toLocaleString() ?? '0' },
                    { label: 'Active Subscriptions', value: metrics?.activeSubscriptions?.toLocaleString() ?? '0' },
                    { label: 'MRR', value: `\u00A3${((metrics?.mrr ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` },
                    { label: 'Pending Verifications', value: metrics?.pendingVerifications?.toLocaleString() ?? '0' },
                    { label: 'Platform Fees', value: `\u00A3${((revenue?.revenueMetrics?.platformFees ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </MotionDiv>

              {/* Recent Transactions */}
              <MotionDiv
                variants={fadeIn}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <Activity className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-600">
                            {activity.time}
                            {activity.amount ? ` \u2022 \u00A3${(activity.amount / 100).toFixed(2)}` : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No recent transactions</p>
                  )}
                </div>
              </MotionDiv>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
