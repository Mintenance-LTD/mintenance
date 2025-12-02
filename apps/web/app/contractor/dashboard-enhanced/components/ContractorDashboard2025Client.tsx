'use client';

import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { ContractorMetricCard2025 } from './ContractorMetricCard2025';
import { ContractorWelcomeHero2025 } from './ContractorWelcomeHero2025';
import { AreaChart, ProgressBar, LineChart } from '@tremor/react';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';
import {
  KpiCard,
  QuickActionsCard,
  StatsCard,
  PerformanceInsightsList,
  EmptyStateCard,
} from '@/components/dashboard';
import type { PerformanceInsight } from '@/components/dashboard';
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Clock,
  Eye,
  Target,
  FileText,
  Upload,
  Search,
  Calendar as CalendarIcon,
  MessageSquare,
  Zap,
  Award,
  MapPin,
  Star,
} from 'lucide-react';

interface ContractorDashboard2025ClientProps {
  data: {
    contractor: {
      id: string;
      name: string;
      company?: string;
      avatar?: string;
      location: string;
      email: string;
    };
    metrics: {
      totalRevenue: number;
      revenueChange: number;
      activeJobs: number;
      completedJobs: number;
      pendingBids: number;
      completionRate: number;
      pendingEscrowAmount: number;
      pendingEscrowCount: number;
    };
    progressTrendData: Array<{
      month: string;
      jobs: number;
      completed: number;
      revenue: number;
    }>;
    recentJobs: Array<{
      id: string;
      title: string;
      status: string;
      budget: number;
      progress: number;
      category?: string;
      priority?: string;
      homeowner: string;
      dueDate?: string;
    }>;
    notifications: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
      isRead: boolean;
    }>;
    subscriptionInfo: {
      tier: 'free' | 'basic' | 'professional' | 'enterprise';
      bidsUsed?: number;
      bidsLimit?: number;
      bidsResetDate?: string;
    } | null;
    hasPaymentSetup: boolean;
    onboardingStatus: {
      stepsCompleted?: number;
      totalSteps?: number;
      isComplete?: boolean;
    } | null;
  };
}

export function ContractorDashboard2025Client({ data }: ContractorDashboard2025ClientProps) {
  const { contractor, metrics, progressTrendData, recentJobs, notifications, subscriptionInfo } = data;
  const [activeTab, setActiveTab] = useState<'bids' | 'inProgress' | 'completed'>('inProgress');

  // Calculate next bid reset date (1st of next month)
  const getNextResetDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-600' };
      case 'in_progress': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-600' };
      case 'assigned': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-600' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-600' };
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'emergency': return 'bg-rose-100 text-rose-700';
      case 'high': return 'bg-emerald-100 text-emerald-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Quick actions for contractors
  const quickActions = [
    {
      label: 'Find Jobs Near You',
      href: '/contractor/jobs-near-you',
      icon: Search,
      variant: 'primary' as const,
    },
    {
      label: 'Create Quote',
      href: '/contractor/quotes/create',
      icon: FileText,
      variant: 'secondary' as const,
    },
    {
      label: 'Upload Portfolio',
      href: '/contractor/profile',
      icon: Upload,
    },
    {
      label: 'Update Availability',
      href: '/contractor/settings',
      icon: CalendarIcon,
    },
  ];

  // Performance insights (AI-powered tips)
  const performanceInsights: PerformanceInsight[] = [
    metrics.completionRate >= 80
      ? {
          id: '1',
          type: 'success',
          title: `Your response time is 20% faster than average! Keep it up`,
          message: `You're completing jobs at an ${Math.round(metrics.completionRate)}% rate, which is excellent!`,
          dismissible: true,
        }
      : {
          id: '1',
          type: 'tip',
          title: 'Improve your completion rate',
          message: 'Completing more jobs on time can help you win more bids and improve your rating.',
          actionLabel: 'View active jobs',
          actionHref: '/contractor/jobs',
          dismissible: true,
        },
    {
      id: '2',
      type: 'info',
      title: 'Jobs in your area are up 35% this week',
      message: 'There are more opportunities than usual. Browse jobs now to get ahead of the competition.',
      actionLabel: 'Browse jobs',
      actionHref: '/contractor/jobs-near-you',
      dismissible: true,
    },
  ];

  // Mock AI-recommended jobs (in real app, fetch from backend)
  const recommendedJobs = [
    {
      id: '1',
      title: 'Kitchen Renovation',
      homeowner: 'Sarah Johnson',
      budget: 5000,
      distance: '2.4 miles',
      postedTime: '2 hours ago',
      seriousBuyerScore: 85,
      category: 'Renovation',
    },
    {
      id: '2',
      title: 'Bathroom Plumbing Repair',
      homeowner: 'Mike Anderson',
      budget: 800,
      distance: '1.1 miles',
      postedTime: '5 hours ago',
      seriousBuyerScore: 92,
      category: 'Plumbing',
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: contractor.name,
          email: contractor.email,
          avatar: contractor.avatar,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Welcome Hero */}
        <ContractorWelcomeHero2025
          contractorName={contractor.name}
          companyName={contractor.company}
          activeJobsCount={metrics.activeJobs}
          pendingBidsCount={metrics.pendingBids}
          completionRate={metrics.completionRate}
        />

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          <MotionDiv
            className="space-y-8"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            {/* Free Plan Bid Counter Banner */}
            {subscriptionInfo?.tier === 'free' && (
              <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-blue-900">Free Plan</h3>
                      <span className="text-sm font-medium text-blue-700">
                        {subscriptionInfo.bidsUsed || 0} of 5 bids used this month
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-teal-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(((subscriptionInfo.bidsUsed || 0) / 5) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-blue-700">
                        Resets on {subscriptionInfo.bidsResetDate || getNextResetDate()}
                      </p>
                      <Link
                        href="/contractor/subscription"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Upgrade for More Bids
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards Row - 5 metrics */}
            <section
              aria-label="Key Performance Indicators"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6"
            >
              <KpiCard
                title="Active Bids"
                value={metrics.pendingBids}
                subtitle="Awaiting response"
                icon={FileText}
                trend={{
                  value: '15%',
                  direction: metrics.pendingBids > 0 ? 'up' : 'neutral',
                }}
                href="/contractor/bids"
                color="amber"
              />
              <KpiCard
                title="This Month Revenue"
                value={formatMoney(metrics.totalRevenue / 12, 'GBP')}
                subtitle="vs last month"
                icon={DollarSign}
                trend={{
                  value: `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange}%`,
                  direction: metrics.revenueChange >= 0 ? 'up' : 'down',
                }}
                color="emerald"
              />
              <KpiCard
                title="Jobs Completed"
                value={metrics.completedJobs}
                subtitle={`${metrics.completionRate.toFixed(0)}% completion rate`}
                icon={Briefcase}
                trend={{
                  value: '8%',
                  direction: metrics.completedJobs > 0 ? 'up' : 'neutral',
                }}
                color="teal"
              />
              <KpiCard
                title="Response Time"
                value="2.4h"
                subtitle="Average response"
                icon={Clock}
                trend={{
                  value: '20% faster',
                  direction: 'up',
                }}
                color="blue"
              />
              <KpiCard
                title="Profile Views"
                value={234}
                subtitle="This week"
                icon={Eye}
                trend={{
                  value: '12%',
                  direction: 'up',
                }}
                color="purple"
              />
            </section>

            {/* Revenue Chart + This Month Stats Row */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column: Revenue Chart (2/3) */}
              <div className="col-span-12 lg:col-span-8">
                <MotionDiv
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                  variants={cardHover}
                  initial="rest"
                  whileHover="hover"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Revenue Trend</h2>
                      <p className="text-sm text-gray-500 mt-1">Last 6 months performance</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-teal-600 rounded-full"></div>
                        <span className="text-sm text-gray-600">Revenue</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                        <span className="text-sm text-gray-600">Jobs</span>
                      </div>
                    </div>
                  </div>

                  <AreaChart
                    data={progressTrendData}
                    index="month"
                    categories={['revenue', 'jobs']}
                    colors={['teal', 'emerald']}
                    valueFormatter={(value) => `£${value.toLocaleString()}`}
                    showAnimation={true}
                    showLegend={false}
                    showGridLines={true}
                    className="h-80"
                  />
                </MotionDiv>
              </div>

              {/* Right Column: This Month Stats Card (1/3) */}
              <div className="col-span-12 lg:col-span-4">
                <MotionDiv
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-full"
                  variants={fadeIn}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                    <h3 className="text-lg font-bold text-gray-900">This Month</h3>
                  </div>

                  <div className="space-y-6">
                    <StatsCard
                      title="Jobs Won"
                      value={Math.round(metrics.activeJobs * 0.6)}
                      icon={Target}
                      color="teal"
                      trend={{
                        value: '12%',
                        direction: 'up',
                      }}
                    />
                    <StatsCard
                      title="Revenue"
                      value={formatMoney(metrics.totalRevenue / 12, 'GBP')}
                      icon={DollarSign}
                      color="emerald"
                      trend={{
                        value: `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange}%`,
                        direction: metrics.revenueChange >= 0 ? 'up' : 'down',
                      }}
                    />
                    <StatsCard
                      title="Response Rate"
                      value="94%"
                      subtitle="Responded to bids"
                      icon={Zap}
                      color="blue"
                      trend={{
                        value: '5%',
                        direction: 'up',
                      }}
                    />
                    <StatsCard
                      title="Lead Conversion"
                      value="68%"
                      subtitle="Bids to jobs"
                      icon={Award}
                      color="purple"
                      trend={{
                        value: '8%',
                        direction: 'up',
                      }}
                    />
                  </div>

                  {/* Pending Escrow Banner */}
                  {metrics.pendingEscrowCount > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-gradient-to-br from-amber-50 to-emerald-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-amber-900 mb-1">Pending Escrow</h4>
                            <div className="text-lg font-bold text-amber-700 mb-1">
                              {formatMoney(metrics.pendingEscrowAmount, 'GBP')}
                            </div>
                            <p className="text-xs text-amber-600">
                              {metrics.pendingEscrowCount} {metrics.pendingEscrowCount === 1 ? 'payment' : 'payments'} pending
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </MotionDiv>
              </div>
            </div>

            {/* Active Bids & Jobs (with tabs) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Active Bids & Jobs</h2>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                  {(['bids', 'inProgress', 'completed'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeTab === tab
                          ? 'bg-white text-teal-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab === 'bids' && `Active Bids (${metrics.pendingBids})`}
                      {tab === 'inProgress' && `In Progress (${metrics.activeJobs})`}
                      {tab === 'completed' && `Completed (${metrics.completedJobs})`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {recentJobs.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No jobs yet</h3>
                    <p className="text-gray-600 mb-4">Start bidding on available jobs to see them here</p>
                    <Link
                      href="/contractor/jobs-near-you"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
                    >
                      Browse Jobs
                    </Link>
                  </div>
                ) : (
                  recentJobs.map((job) => {
                    const statusColors = getStatusColor(job.status);
                    return (
                      <Link
                        key={job.id}
                        href={`/contractor/jobs/${job.id}`}
                        className="block p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                                {job.status.replace('_', ' ').toUpperCase()}
                              </span>
                              {job.priority && (
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getPriorityColor(job.priority)}`}>
                                  {job.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">Client: {job.homeowner}</p>

                            {/* Progress Bar */}
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">Progress</span>
                                <span className="text-xs font-medium text-gray-900">{Math.round(job.progress)}%</span>
                              </div>
                              <ProgressBar value={job.progress} color="teal" className="h-2" />
                            </div>

                            {job.category && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="capitalize">{job.category}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900 mb-1">
                              {formatMoney(job.budget, 'GBP')}
                            </div>
                            {job.dueDate && (
                              <div className="text-sm text-gray-500">
                                Due: {new Date(job.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Leads/Opportunities + Quick Actions Row */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column: Leads/Opportunities (1/2) */}
              <div className="col-span-12 lg:col-span-6">
                <MotionDiv
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm"
                  variants={fadeIn}
                >
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Recommended Jobs</h2>
                        <p className="text-sm text-gray-500 mt-1">AI-matched to your skills</p>
                      </div>
                      <Star className="w-6 h-6 text-amber-500" />
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {recommendedJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="block p-4 rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                            <p className="text-sm text-gray-600 mb-2">{job.homeowner}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{job.distance}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{job.postedTime}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-emerald-700 mb-1">
                              £{job.budget.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-teal-700">
                                {job.seriousBuyerScore}% match
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                          Quick Bid
                        </button>
                      </Link>
                    ))}
                    <Link
                      href="/contractor/jobs-near-you"
                      className="block text-center py-3 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      View All Jobs →
                    </Link>
                  </div>
                </MotionDiv>
              </div>

              {/* Right Column: Quick Actions (1/2) */}
              <div className="col-span-12 lg:col-span-6">
                <QuickActionsCard
                  title="Quick Actions"
                  subtitle="Grow your business faster"
                  actions={quickActions}
                />
              </div>
            </div>

            {/* Performance Insights */}
            <PerformanceInsightsList
              insights={performanceInsights}
              title="Performance Insights"
            />
          </MotionDiv>
        </div>
      </main>
    </div>
  );
}
