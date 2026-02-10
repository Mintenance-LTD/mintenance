'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { logger } from '@mintenance/shared';

// Dynamic imports for Tremor charts - lazy load heavy charting library
const AreaChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.AreaChart })), {
  loading: () => <ChartSkeleton height="280px" />,
  ssr: false,
});

const BarChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.BarChart })), {
  loading: () => <ChartSkeleton height="280px" />,
  ssr: false,
});

const DonutChart = dynamic(() => import('@tremor/react').then(mod => ({ default: mod.DonutChart })), {
  loading: () => <ChartSkeleton height="280px" />,
  ssr: false,
});

interface DashboardData {
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

export default function AdminDashboardPage2025() {
  const { user } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/admin/dashboard/metrics');
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        logger.error('Failed to fetch admin dashboard data', err, { service: 'admin' });
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const metrics = data ? [
    { label: 'Total Users', value: data.totalUsers.toLocaleString(), icon: '👥' },
    { label: 'Contractors', value: data.totalContractors.toLocaleString(), icon: '🔨' },
    { label: 'Total Jobs', value: data.totalJobs.toLocaleString(), icon: '📋' },
    { label: 'Active Subscriptions', value: data.activeSubscriptions.toLocaleString(), icon: '💳' },
    { label: 'Monthly Revenue', value: `£${data.mrr.toLocaleString()}`, icon: '💰' },
    { label: 'Pending Verifications', value: data.pendingVerifications.toLocaleString(), icon: '🔍' },
  ] : [];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="admin"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: user?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-1">Admin Dashboard</h1>
                  <p className="text-purple-100 text-lg">Platform overview and metrics</p>
                </div>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl p-1 border border-white/30" role="tablist" aria-label="Select time period">
                {[
                  { label: 'Week', value: 'week' as const },
                  { label: 'Month', value: 'month' as const },
                  { label: 'Quarter', value: 'quarter' as const },
                  { label: 'Year', value: 'year' as const },
                ].map((period) => (
                  <button
                    key={period.value}
                    role="tab"
                    aria-selected={selectedPeriod === period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedPeriod === period.value
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
              <p className="font-semibold">Error loading dashboard</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-pulse">
                  <div className="h-12 w-12 bg-gray-200 rounded-xl mb-4" />
                  <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              ))}
            </div>
          )}

          {/* Metrics Grid */}
          {!loading && data && (
            <>
              <MotionDiv
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6"
                aria-live="polite"
                aria-label="Platform metrics"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {metrics.map((metric) => (
                  <MotionDiv
                    key={metric.label}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                    variants={staggerItem}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <span className="text-2xl" aria-hidden="true">{metric.icon}</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
                    <div className="text-sm text-gray-600">{metric.label}</div>
                  </MotionDiv>
                ))}
              </MotionDiv>

              {/* Charts Row */}
              {data.charts && (
                <section aria-label="Growth charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* User Growth */}
                  <MotionDiv
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                  >
                    <h2 className="text-xl font-bold text-gray-900 mb-4">User Growth (30 days)</h2>
                    {data.charts.userGrowth.length > 0 ? (
                      <AreaChart
                        data={data.charts.userGrowth}
                        index="date"
                        categories={['cumulative']}
                        colors={['purple']}
                        valueFormatter={(value) => `${value} users`}
                        showAnimation={true}
                        showLegend={false}
                        showGridLines={false}
                        className="h-80"
                      />
                    ) : (
                      <div className="h-80 flex items-center justify-center text-gray-400">
                        No user data for the selected period
                      </div>
                    )}
                  </MotionDiv>

                  {/* Job Growth */}
                  <MotionDiv
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                  >
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Job Growth (30 days)</h2>
                    {data.charts.jobGrowth.length > 0 ? (
                      <BarChart
                        data={data.charts.jobGrowth}
                        index="date"
                        categories={['jobs']}
                        colors={['emerald']}
                        valueFormatter={(value) => `${value} jobs`}
                        showAnimation={true}
                        className="h-80"
                      />
                    ) : (
                      <div className="h-80 flex items-center justify-center text-gray-400">
                        No job data for the selected period
                      </div>
                    )}
                  </MotionDiv>
                </section>
              )}
            </>
          )}

          {/* Quick Actions */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Manage Users', icon: '👥', href: '/admin/users' },
                { label: 'View Revenue', icon: '💰', href: '/admin/revenue' },
                { label: 'Building Assessments', icon: '🏢', href: '/admin/building-assessments' },
                { label: 'Communications', icon: '📧', href: '/admin/communications' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => window.location.href = action.href}
                  className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 hover:shadow-lg transition-all group"
                >
                  <div className="text-3xl mb-2" aria-hidden="true">{action.icon}</div>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-purple-600">
                    {action.label}
                  </div>
                </button>
              ))}
            </div>
          </MotionDiv>
        </div>
      </main>
    </div>
  );
}
