'use client';

import React, { useState } from 'react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Clock,
  Target,
  Eye,
  PoundSterling,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  Award,
  Zap,
  FileText,
  Search,
  Upload,
  MessageSquare,
  BarChart3,
  Activity,
} from 'lucide-react';
import Image from 'next/image';
import { Bot, Settings } from 'lucide-react';

interface ContractorDashboardProfessionalProps {
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

export function ContractorDashboardProfessional({ data }: ContractorDashboardProfessionalProps) {
  const { contractor, metrics, progressTrendData, recentJobs } = data;
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // Calculate derived metrics
  const thisMonthRevenue = metrics.totalRevenue / 12;
  const avgResponseTime = '2.4h';
  const profileViews = 234;
  const winRate = 68;

  // Quick actions
  const quickActions = [
    {
      icon: Search,
      label: 'Find Jobs',
      href: '/contractor/jobs-near-you',
      color: 'navy',
    },
    {
      icon: FileText,
      label: 'Create Quote',
      href: '/contractor/quotes/create',
      color: 'mint',
    },
    {
      icon: Upload,
      label: 'Upload Work',
      href: '/contractor/portfolio',
      color: 'gold',
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      href: '/contractor/messages',
      color: 'purple',
    },
  ];

  // Status badge styling
  const getStatusStyle = (status: string) => {
    const styles = {
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
      assigned: 'bg-purple-50 text-purple-700 border-purple-200',
      posted: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return styles[status as keyof typeof styles] || styles.posted;
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <ContractorPageWrapper>
      <div className="space-y-8 pb-12">
        {/* Professional Welcome Section - Birch Inspired */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Welcome back, {contractor.company || contractor.name.split(' ')[0]}
                  </h1>
                  {contractor.avatar && (
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                      <Image
                        src={contractor.avatar}
                        alt={contractor.company || contractor.name}
                        width={56}
                        height={56}
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
                {contractor.location && (
                  <p className="text-slate-300 text-lg mb-1">{contractor.location}</p>
                )}
                <p className="text-slate-400 text-sm">{contractor.location}</p>
              </div>
            </div>

            {/* Quick Stats Inline */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-2xl md:text-3xl font-bold mb-1">
                  {Math.round(metrics.completionRate)}%
                </div>
                <div className="text-slate-300 text-sm">Completion Rate</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-2xl md:text-3xl font-bold mb-1">
                  {metrics.activeJobs}
                </div>
                <div className="text-slate-300 text-sm">Active Jobs</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-2xl md:text-3xl font-bold mb-1">
                  {metrics.pendingBids}
                </div>
                <div className="text-slate-300 text-sm">Pending Bids</div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI Cards - Revealbot Inspired with Bold Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Card - Navy/Gold */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                <PoundSterling className="w-6 h-6 text-amber-400" />
              </div>
              {metrics.revenueChange >= 0 ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {metrics.revenueChange}%
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {Math.abs(metrics.revenueChange)}%
                </div>
              )}
            </div>
            <div className="mb-1">
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {formatMoney(thisMonthRevenue, 'GBP')}
              </div>
              <div className="text-sm text-slate-600 font-medium">This month revenue</div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">Total: {formatMoney(metrics.totalRevenue, 'GBP')}</div>
            </div>
          </div>

          {/* Completed Jobs - Mint */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold">
                {Math.round(metrics.completionRate)}% rate
              </div>
            </div>
            <div className="mb-1">
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {metrics.completedJobs}
              </div>
              <div className="text-sm text-slate-600 font-medium">Jobs completed</div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">Active: {metrics.activeJobs}</div>
            </div>
          </div>

          {/* Response Time - Navy/Blue */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                20%
              </div>
            </div>
            <div className="mb-1">
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {avgResponseTime}
              </div>
              <div className="text-sm text-slate-600 font-medium">Avg response time</div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">20% faster than avg</div>
            </div>
          </div>

          {/* Win Rate - Gold/Purple */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                8%
              </div>
            </div>
            <div className="mb-1">
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {winRate}%
              </div>
              <div className="text-sm text-slate-600 font-medium">Bid win rate</div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">Bids: {metrics.pendingBids}</div>
            </div>
          </div>
        </section>

        {/* Revenue Chart Section - Revealbot Style */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Revenue Overview</h2>
                <p className="text-sm text-slate-600">Performance across last 6 months</p>
              </div>
              <div className="flex items-center gap-2">
                {(['week', 'month', 'quarter'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      selectedPeriod === period
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Clean bar chart */}
            <div className="space-y-5">
              {progressTrendData.slice(-6).map((item, idx) => {
                const maxRevenue = Math.max(...progressTrendData.map(d => d.revenue));
                const percentage = (item.revenue / maxRevenue) * 100;

                return (
                  <div key={item.month}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700 w-16">{item.month}</span>
                        <span className="text-xs text-slate-500">{item.jobs} jobs</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        £{item.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-slate-200">
              <div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {formatMoney(metrics.totalRevenue, 'GBP')}
                </div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {metrics.completedJobs}
                </div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Completed Jobs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {formatMoney(metrics.totalRevenue / (metrics.completedJobs || 1), 'GBP')}
                </div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Avg Job Value</div>
              </div>
            </div>
          </div>
        </section>

        {/* Professional Data Table - Active Jobs */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Active Jobs</h2>
                <p className="text-sm text-slate-600">Manage your ongoing projects</p>
              </div>
              <Link
                href="/contractor/jobs"
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {recentJobs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No active jobs</h3>
              <p className="text-slate-600 mb-6 text-sm">Start bidding to see your jobs here</p>
              <Link
                href="/contractor/jobs-near-you"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
              >
                Browse Jobs
                <Search className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/contractor/jobs/${job.id}`}
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{job.title}</div>
                        {job.category && (
                          <div className="text-xs text-slate-500 mt-1 capitalize">{job.category}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-slate-700">{job.homeowner}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusStyle(job.status)}`}>
                          {formatStatus(job.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                            {Math.round(job.progress)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-sm font-bold text-slate-900">
                          {formatMoney(job.budget, 'GBP')}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/contractor/jobs/${job.id}`;
                          }}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                          View
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const colorStyles = {
              navy: 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black',
              mint: 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
              gold: 'bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600',
              purple: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
            };

            return (
              <Link
                key={action.label}
                href={action.href}
                className={`group ${colorStyles[action.color as keyof typeof colorStyles]} rounded-2xl p-6 text-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
              >
                <action.icon className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-bold mb-1">{action.label}</h3>
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <span>Quick access</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </Link>
            );
          })}
        </section>

        {/* AI Agent Automation Summary */}
        <section>
            <Link
            href="/contractor/settings?section=automation"
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 block"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">AI Agent Automation</h3>
                  <p className="text-sm text-slate-500">Control how AI agents assist you</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 group-hover:text-indigo-700">
                <span className="text-sm font-medium">Manage</span>
                <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Configure automation levels, bid acceptance, smart pricing, and more in your settings.
            </p>
          </Link>
        </section>

        {/* Recent Activity Feed */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className="p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 mb-1">{notification.message}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(notification.timestamp).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 text-center">
            <Link
              href="/contractor/notifications"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              View All Notifications
            </Link>
          </div>
        </section>
      </div>
    </ContractorPageWrapper>
  );
}
