'use client';

import React, { useState } from 'react';
import { HomeownerPageWrapper } from './HomeownerPageWrapper';
import { ListingCard, Badge, Button } from '@/components/airbnb-system';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckCircle,
  Clock,
  TrendingUp,
  Home,
  Users,
  Calendar,
  ArrowRight,
  Star,
  Briefcase
} from 'lucide-react';
import Image from 'next/image';

interface HomeownerDashboardAirbnbProps {
  data: {
    homeowner: {
      id: string;
      name: string;
      avatar?: string;
      location: string;
      email: string;
    };
    metrics: {
      totalSpent: number;
      activeJobs: number;
      completedJobs: number;
      savedContractors: number;
    };
    activeJobs: Array<{
      id: string;
      title: string;
      status: string;
      budget: number;
      category?: string;
      contractor?: {
        name: string;
        image?: string;
      };
      progress: number;
      bidsCount: number;
      scheduledDate?: string;
    }>;
    recentActivity: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
    }>;
  };
}

export function HomeownerDashboardAirbnb(props: HomeownerDashboardAirbnbProps) {
  const { data } = props || {};
  const { homeowner, metrics, activeJobs, recentActivity } = data || {};
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Early return if required data is missing
  if (!data || !homeowner || !metrics || !activeJobs || !recentActivity) {
    return null;
  }

  // Filter jobs
  const filteredJobs = activeJobs.filter(job => {
    if (activeFilter === 'active') return job.status === 'in_progress' || job.status === 'posted';
    if (activeFilter === 'completed') return job.status === 'completed';
    return true;
  });

  // Quick stats for hero
  const quickStats = [
    {
      label: 'Active Jobs',
      value: metrics.activeJobs,
      color: 'text-teal-600'
    },
    {
      label: 'Completed',
      value: metrics.completedJobs,
      color: 'text-emerald-600'
    },
    {
      label: 'Saved Contractors',
      value: metrics.savedContractors,
      color: 'text-blue-600'
    }
  ];

  return (
    <HomeownerPageWrapper>
      <div className="space-y-8 pb-12">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-8 md:p-12 text-white shadow-lg animate-fade-in">
          <div className="max-w-5xl">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">
                  Welcome back, {homeowner.name.split(' ')[0]}
                </h1>
                <p className="text-teal-100 text-xl">
                  {metrics.activeJobs > 0
                    ? `You have ${metrics.activeJobs} active ${metrics.activeJobs === 1 ? 'job' : 'jobs'}`
                    : 'Ready to start a new project?'}
                </p>
              </div>
              {homeowner.avatar && (
                <div className="hidden md:block">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/20">
                    <Image
                      src={homeowner.avatar}
                      alt={homeowner.name}
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
                onClick={() => window.location.href = '/jobs/create'}
                style={{
                  backgroundColor: 'white',
                  color: '#14b8a6',
                  border: 'none'
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Post a Job
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/contractors'}
                style={{
                  backgroundColor: 'transparent',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                }}
              >
                <Search className="w-5 h-5 mr-2" />
                Find Contractors
              </Button>
            </div>
          </div>
        </section>

        {/* Key Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          {/* Total Spent Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatMoney(metrics.totalSpent, 'GBP')}
            </div>
            <div className="text-sm text-gray-600">Total spent on projects</div>
          </div>

          {/* Active Jobs Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-teal-600" />
              </div>
              <Badge variant="info" size="sm">
                In progress
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.activeJobs}
            </div>
            <div className="text-sm text-gray-600">Active jobs</div>
          </div>

          {/* Completed Jobs Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.completedJobs}
            </div>
            <div className="text-sm text-gray-600">Jobs completed</div>
          </div>

          {/* Saved Contractors Card */}
          <div className="card-airbnb p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics.savedContractors}
            </div>
            <div className="text-sm text-gray-600">Saved contractors</div>
          </div>
        </section>

        {/* Jobs Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Jobs</h2>
              <p className="text-gray-600 mt-1">Manage and track your home projects</p>
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
                <Home className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs yet</h3>
              <p className="text-gray-600 mb-6">Post your first job to get started with trusted contractors</p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => window.location.href = '/jobs/create'}
              >
                <Plus className="w-5 h-5 mr-2" />
                Post a Job
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
              {filteredJobs.map((job) => {
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
                  posted: { variant: 'info' as const, label: `${job.bidsCount} Bids` },
                  assigned: { variant: 'info' as const, label: 'Assigned' }
                }[job.status] || { variant: 'neutral' as const, label: 'Posted' };

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

                      {job.contractor && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          {job.contractor.image && (
                            <div className="w-6 h-6 rounded-full overflow-hidden">
                              <Image
                                src={job.contractor.image}
                                alt={job.contractor.name}
                                width={24}
                                height={24}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <span className="line-clamp-1">{job.contractor.name}</span>
                        </div>
                      )}

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
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xl font-bold text-gray-900">
                          {formatMoney(job.budget, 'GBP')}
                        </div>
                        {job.scheduledDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(job.scheduledDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short'
                            })}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => window.location.href = `/jobs/${job.id}`}
                        className="w-full px-4 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 group"
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
                href="/jobs"
                className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                View all jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-airbnb p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100">
            <Users className="w-10 h-10 text-teal-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Find Trusted Contractors
            </h3>
            <p className="text-gray-600 mb-4">
              Browse verified professionals in your area for your next project
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = '/contractors'}
            >
              Browse Contractors
            </Button>
          </div>

          <div className="card-airbnb p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100">
            <Home className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Manage Your Properties
            </h3>
            <p className="text-gray-600 mb-4">
              Add properties to keep track of maintenance and repairs
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/properties'}
            >
              View Properties
            </Button>
          </div>
        </section>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <section className="card-airbnb p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 text-sm">{activity.message}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </HomeownerPageWrapper>
  );
}
