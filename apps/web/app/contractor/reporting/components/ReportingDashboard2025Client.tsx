'use client';

import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatMoney } from '@/lib/utils/currency';
import { AreaChart, BarChart, DonutChart } from '@tremor/react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface ReportingDashboard2025ClientProps {
  analytics: {
    totalJobs: number;
    completedJobs: number;
    activeJobs: number;
    totalRevenue: number;
    totalClients: number;
    activeClients: number;
    averageJobValue: number;
    customerSatisfaction: number;
    jobsByCategory: Array<{ category: string; count: number; revenue: number }>;
    revenueByMonth: Array<{ month: string; revenue: number; jobs: number }>;
    topClients: Array<{ name: string; totalSpent: number; jobsCount: number }>;
    totalBids: number;
    acceptedBids: number;
    winRate: number;
  };
}

export function ReportingDashboard2025Client({ analytics }: ReportingDashboard2025ClientProps) {
  const { user } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  const metrics: Array<{
    label: string;
    value: string | number;
    icon: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  }> = [
    { label: 'Total Revenue', value: formatMoney(analytics.totalRevenue, 'GBP'), icon: '💰', change: '+12%', changeType: 'positive' },
    { label: 'Jobs Completed', value: analytics.completedJobs, icon: '✅', change: '+8%', changeType: 'positive' },
    { label: 'Active Jobs', value: analytics.activeJobs, icon: '🔨', change: '0%', changeType: 'neutral' },
    { label: 'Avg Job Value', value: formatMoney(analytics.averageJobValue, 'GBP'), icon: '📊', change: '+5%', changeType: 'positive' },
    { label: 'Win Rate', value: `${analytics.winRate.toFixed(0)}%`, icon: '🎯', change: '+3%', changeType: 'positive' },
    { label: 'Total Clients', value: analytics.totalClients, icon: '👥', change: '+15%', changeType: 'positive' },
  ];

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`);
    // Export logic would go here
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-1">Business Analytics</h1>
                  <p className="text-teal-100 text-lg">Track your performance and revenue trends</p>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {/* Period Selector */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center gap-3">
              {[
                { label: 'Week', value: 'week' as const },
                { label: 'Month', value: 'month' as const },
                { label: 'Quarter', value: 'quarter' as const },
                { label: 'Year', value: 'year' as const },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    selectedPeriod === period.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </MotionDiv>

          {/* Metrics Grid */}
          <MotionDiv
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6"
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
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">{metric.icon}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    metric.changeType === 'positive'
                      ? 'bg-emerald-100 text-emerald-700'
                      : metric.changeType === 'negative'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {metric.change}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.label}</div>
              </MotionDiv>
            ))}
          </MotionDiv>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue Trend */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Trend</h2>
              <AreaChart
                data={analytics.revenueByMonth}
                index="month"
                categories={['revenue']}
                colors={['teal']}
                valueFormatter={(value) => `£${value.toLocaleString()}`}
                showAnimation={true}
                showLegend={false}
                showGridLines={false}
                className="h-80"
              />
            </MotionDiv>

            {/* Jobs by Category */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Jobs by Category</h2>
              <DonutChart
                data={analytics.jobsByCategory}
                category="count"
                index="category"
                colors={['teal', 'emerald', 'cyan', 'sky', 'blue', 'indigo']}
                valueFormatter={(value) => `${value} jobs`}
                showAnimation={true}
                className="h-80"
              />
            </MotionDiv>
          </div>

          {/* Revenue by Category */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue by Category</h2>
            <BarChart
              data={analytics.jobsByCategory}
              index="category"
              categories={['revenue']}
              colors={['teal']}
              valueFormatter={(value) => formatMoney(value, 'GBP')}
              showAnimation={true}
              showLegend={false}
              className="h-80"
            />
          </MotionDiv>

          {/* Category Breakdown Table */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Category Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Jobs</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.jobsByCategory
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((category, index) => (
                      <tr key={category.category} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{category.category}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{category.count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          {formatMoney(category.revenue, 'GBP')}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {formatMoney(category.count > 0 ? category.revenue / category.count : 0, 'GBP')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </MotionDiv>
        </div>
      </main>
    </div>
  );
}
