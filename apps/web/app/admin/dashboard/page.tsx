'use client';

import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AreaChart, BarChart, DonutChart } from '@tremor/react';
import { MotionDiv } from '@/components/ui/MotionDiv';

export default function AdminDashboardPage2025() {
  const { user } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  // Mock data
  const revenueData = [
    { month: 'Jan', revenue: 45000, users: 120 },
    { month: 'Feb', revenue: 52000, users: 145 },
    { month: 'Mar', revenue: 48000, users: 135 },
    { month: 'Apr', revenue: 61000, users: 168 },
    { month: 'May', revenue: 55000, users: 152 },
    { month: 'Jun', revenue: 67000, users: 189 },
  ];

  const userGrowthData = [
    { category: 'Homeowners', count: 450 },
    { category: 'Contractors', count: 280 },
    { category: 'Pending', count: 45 },
  ];

  const jobsData = [
    { month: 'Jan', posted: 89, completed: 67 },
    { month: 'Feb', posted: 102, completed: 78 },
    { month: 'Mar', posted: 95, completed: 71 },
    { month: 'Apr', posted: 118, completed: 89 },
    { month: 'May', posted: 108, completed: 82 },
    { month: 'Jun', posted: 125, completed: 95 },
  ];

  const metrics = [
    { label: 'Total Revenue', value: '£328,000', change: '+18%', changeType: 'positive' as const, icon: '💰' },
    { label: 'Total Users', value: '775', change: '+12%', changeType: 'positive' as const, icon: '👥' },
    { label: 'Active Jobs', value: '156', change: '+8%', changeType: 'positive' as const, icon: '🔨' },
    { label: 'Completion Rate', value: '76%', change: '+3%', changeType: 'positive' as const, icon: '✅' },
    { label: 'Platform Fee', value: '£32,800', change: '+18%', changeType: 'positive' as const, icon: '💳' },
    { label: 'Support Tickets', value: '23', change: '-15%', changeType: 'positive' as const, icon: '🎫' },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="admin"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
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
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-1">Admin Dashboard</h1>
                  <p className="text-purple-100 text-lg">Platform overview and metrics</p>
                </div>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl p-1 border border-white/30">
                {[
                  { label: 'Week', value: 'week' as const },
                  { label: 'Month', value: 'month' as const },
                  { label: 'Quarter', value: 'quarter' as const },
                  { label: 'Year', value: 'year' as const },
                ].map((period) => (
                  <button
                    key={period.value}
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
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">{metric.icon}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    metric.changeType === 'positive'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
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
                data={revenueData}
                index="month"
                categories={['revenue']}
                colors={['purple']}
                valueFormatter={(value) => `£${value.toLocaleString()}`}
                showAnimation={true}
                showLegend={false}
                showGridLines={false}
                className="h-80"
              />
            </MotionDiv>

            {/* User Distribution */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">User Distribution</h2>
              <DonutChart
                data={userGrowthData}
                category="count"
                index="category"
                colors={['purple', 'indigo', 'violet']}
                valueFormatter={(value) => `${value} users`}
                showAnimation={true}
                className="h-80"
              />
            </MotionDiv>
          </div>

          {/* Jobs Activity */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Jobs Activity</h2>
            <BarChart
              data={jobsData}
              index="month"
              categories={['posted', 'completed']}
              colors={['purple', 'emerald']}
              valueFormatter={(value) => `${value} jobs`}
              showAnimation={true}
              className="h-80"
            />
          </MotionDiv>

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
                  <div className="text-3xl mb-2">{action.icon}</div>
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
