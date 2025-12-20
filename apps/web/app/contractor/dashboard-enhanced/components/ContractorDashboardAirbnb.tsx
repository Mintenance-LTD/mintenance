'use client';

import React, { useState, useCallback } from 'react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { ListingCard, Badge, Button, RatingStars } from '@/components/airbnb-system';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import {
  TrendingUp,
  Briefcase,
  Clock,
  Star,
  CheckCircle,
  MapPin,
  Calendar,
  ArrowRight,
  Zap
} from 'lucide-react';
import Image from 'next/image';

interface ContractorDashboardAirbnbProps {
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

export function ContractorDashboardAirbnb({ data }: ContractorDashboardAirbnbProps) {
  const { contractor, metrics, recentJobs } = data;
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Filter jobs based on active filter
  const filteredJobs = recentJobs.filter(job => {
    if (activeFilter === 'active') return job.status === 'in_progress' || job.status === 'assigned';
    if (activeFilter === 'completed') return job.status === 'completed';
    return true;
  });

  // Calculate stats
  const thisMonthRevenue = metrics.totalRevenue / 12;
  const avgResponseTime = '2.4h';
  const profileViews = 234;

  // Quick stats for hero section
  const quickStats = [
    {
      label: 'Completion Rate',
      value: `${Math.round(metrics.completionRate)}%`,
      color: 'text-emerald-600'
    },
    {
      label: 'Active Jobs',
      value: metrics.activeJobs,
      color: 'text-teal-600'
    },
    {
      label: 'Pending Bids',
      value: metrics.pendingBids,
      color: 'text-amber-600'
    }
  ];

  return (
    <ContractorPageWrapper>
      <div className="space-y-8 pb-12">
        {/* Hero Section - Airbnb Style */}
        <section className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-12 text-white shadow-lg animate-fade-in">
          <div className="max-w-5xl">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">
                  Welcome back, {contractor.name.split(' ')[0]}
                </h1>
                {contractor.company && (
                  <p className="text-teal-100 text-xl">{contractor.company}</p>
                )}
              </div>
              {contractor.avatar && (
                <div className="hidden md:block">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/20">
                    <Image
                      src={contractor.avatar}
                      alt={contractor.name}
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              {quickStats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 animate-slide-up"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-teal-100 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.location.href = '/contractor/jobs-near-you'}
                style={{
                  backgroundColor: 'white',
                  color: '#14b8a6',
                  border: 'none'
                }}
              >
                Find New Jobs
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/contractor/quotes/create'}
                style={{
                  backgroundColor: 'transparent',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                }}
              >
                Create Quote
              </Button>
            </div>
          </div>
        </section>

        {/* Key Metrics - Card Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          {/* Revenue Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <Badge
                variant={metrics.revenueChange >= 0 ? 'success' : 'error'}
                size="sm"
              >
                {metrics.revenueChange >= 0 ? '+' : ''}{metrics.revenueChange}%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatMoney(thisMonthRevenue, 'GBP')}
            </div>
            <div className="text-sm text-gray-600">This month revenue</div>
          </div>

          {/* Completed Jobs Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-teal-600" />
              </div>
              <Badge variant="info" size="sm">
                {Math.round(metrics.completionRate)}% rate
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.completedJobs}
            </div>
            <div className="text-sm text-gray-600">Jobs completed</div>
          </div>

          {/* Response Time Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <Badge variant="success" size="sm">
                20% faster
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {avgResponseTime}
            </div>
            <div className="text-sm text-gray-600">Avg response time</div>
          </div>

          {/* Profile Views Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <Badge variant="warning" size="sm">
                +12%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {profileViews}
            </div>
            <div className="text-sm text-gray-600">Profile views</div>
          </div>
        </section>

        {/* Revenue Chart - Simplified Airbnb Style */}
        <section className="card-airbnb p-6 md:p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Revenue Overview</h2>
              <p className="text-gray-600 mt-1">Last 6 months performance</p>
            </div>
            <Link
              href="/contractor/finance"
              className="text-teal-600 font-semibold text-sm hover:text-teal-700 transition-colors"
            >
              View Details →
            </Link>
          </div>

          {/* Simple bar chart using CSS */}
          <div className="space-y-4">
            {data.progressTrendData.slice(-6).map((item, idx) => {
              const maxRevenue = Math.max(...data.progressTrendData.map(d => d.revenue));
              const percentage = (item.revenue / maxRevenue) * 100;

              return (
                <div key={item.month} className="animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.month}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      £{item.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Jobs Section - Listing Cards */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Jobs</h2>
              <p className="text-gray-600 mt-1">Manage your active and completed work</p>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2">
              {(['all', 'active', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeFilter === filter
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="card-airbnb p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs yet</h3>
              <p className="text-gray-600 mb-6">Start bidding on available jobs to see them here</p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => window.location.href = '/contractor/jobs-near-you'}
              >
                Browse Jobs
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
              {filteredJobs.map((job) => {
                // Generate placeholder image based on job category
                const categoryImages: Record<string, string> = {
                  plumbing: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800',
                  electrical: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800',
                  renovation: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800',
                  painting: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=800',
                  default: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800'
                };

                const image = job.category
                  ? categoryImages[job.category.toLowerCase()] || categoryImages.default
                  : categoryImages.default;

                const statusBadge = {
                  completed: { variant: 'success' as const, label: 'Completed' },
                  in_progress: { variant: 'warning' as const, label: 'In Progress' },
                  assigned: { variant: 'info' as const, label: 'Assigned' },
                  posted: { variant: 'neutral' as const, label: 'Posted' }
                }[job.status] || { variant: 'neutral' as const, label: 'Unknown' };

                return (
                  <div key={job.id} className="card-airbnb overflow-hidden cursor-pointer group">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={image}
                        alt={job.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3">
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                        {job.title}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <span className="line-clamp-1">{job.homeowner}</span>
                      </div>

                      {/* Progress Bar for in-progress jobs */}
                      {job.status === 'in_progress' && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">Progress</span>
                            <span className="text-xs font-medium text-gray-900">
                              {Math.round(job.progress)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Budget and Date */}
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-gray-900">
                          {formatMoney(job.budget, 'GBP')}
                        </div>
                        {job.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(job.dueDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short'
                            })}</span>
                          </div>
                        )}
                      </div>

                      {/* View Button */}
                      <button
                        onClick={() => window.location.href = `/contractor/jobs/${job.id}`}
                        className="mt-4 w-full px-4 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 group"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View All Link */}
          {filteredJobs.length > 0 && (
            <div className="mt-8 text-center">
              <Link
                href="/contractor/jobs"
                className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                View all jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        {/* Quick Actions Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-airbnb p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100">
            <Star className="w-10 h-10 text-teal-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Boost Your Profile
            </h3>
            <p className="text-gray-600 mb-4">
              Complete your portfolio and add more skills to attract better jobs
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = '/contractor/profile'}
            >
              Update Profile
            </Button>
          </div>

          <div className="card-airbnb p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100">
            <MapPin className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Jobs Near You
            </h3>
            <p className="text-gray-600 mb-4">
              {metrics.pendingBids > 0
                ? `You have ${metrics.pendingBids} active bids. Check new opportunities!`
                : 'Discover new opportunities in your area'}
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/contractor/jobs-near-you'}
            >
              Browse Jobs
            </Button>
          </div>
        </section>
      </div>
    </ContractorPageWrapper>
  );
}
