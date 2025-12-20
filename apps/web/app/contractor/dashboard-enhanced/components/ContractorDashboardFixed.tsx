'use client';

import React from 'react';
import { ContractorPageWrapper } from '../../components/ContractorPageWrapper';
import { JobCard } from '@/components/cards/JobCard';
import {
  PoundSterling,
  Briefcase,
  MessageSquare,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  Star,
  AlertCircle,
  Heart,
  Search,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface ContractorDashboardFixedProps {
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
    hasPaymentSetup: boolean;
    onboardingStatus: {
      stepsCompleted?: number;
      totalSteps?: number;
      isComplete?: boolean;
    } | null;
  };
}

export function ContractorDashboardFixed({ data }: ContractorDashboardFixedProps) {
  const { contractor, metrics, recentJobs, notifications } = data;

  const calculateResponseRate = () => {
    const totalBids = metrics.pendingBids + metrics.activeJobs + metrics.completedJobs;
    if (totalBids === 0) return 0;
    return Math.round(((metrics.activeJobs + metrics.completedJobs) / totalBids) * 100);
  };

  const calculateRating = () => {
    return 4.8;
  };

  const getUpcomingJobs = () => {
    return recentJobs
      .filter((job) => job.dueDate && new Date(job.dueDate) > new Date())
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 3);
  };

  return (
    <ContractorPageWrapper>
      <div className="space-y-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-xl shadow p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-teal-50">
                {contractor.avatar ? (
                  <Image
                    src={contractor.avatar}
                    alt={contractor.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                    {contractor.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  Welcome back, {contractor.name.split(' ')[0]}
                </h1>
                <p className="text-gray-600 text-base">
                  {contractor.company || contractor.email}
                </p>
                {contractor.location && (
                  <div className="flex items-center gap-2 text-gray-500 mt-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{contractor.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Card */}
          <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
                <PoundSterling className="w-6 h-6 text-teal-600" />
              </div>
              {metrics.revenueChange !== 0 && (
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    metrics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <TrendingUp
                    className={`w-4 h-4 ${metrics.revenueChange < 0 ? 'rotate-180' : ''}`}
                  />
                  <span>{Math.abs(metrics.revenueChange).toFixed(0)}%</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-1">Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              £{metrics.totalRevenue.toLocaleString()}
            </p>
          </div>

          {/* Active Jobs Card */}
          <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-1">Active Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.activeJobs}</p>
          </div>

          {/* Response Rate Card */}
          <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-1">Response Rate</p>
            <p className="text-2xl font-bold text-gray-900">{calculateResponseRate()}%</p>
          </div>

          {/* Rating Card */}
          <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-1">Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{calculateRating()}</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= calculateRating()
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Link href="/contractor/discover">
            <button className="px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Jobs
            </button>
          </Link>
          <Link href="/contractor/bid">
            <button className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              View Bids
            </button>
          </Link>
          <Link href="/messages">
            <button className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Jobs Feed */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Available Jobs Near You</h2>
              <Link href="/contractor/discover">
                <button className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                  View all
                </button>
              </Link>
            </div>
            <div className="space-y-6">
              {recentJobs.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-12 text-center">
                  <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs available</h3>
                  <p className="text-gray-600 mb-6">Check back later for new opportunities</p>
                  <Link href="/contractor/discover">
                    <button className="px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors">
                      Browse All Jobs
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {recentJobs.slice(0, 3).map((job) => (
                    <JobCard
                      key={job.id}
                      id={job.id}
                      imageUrl="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400"
                      title={job.title}
                      location={job.category || 'Location not specified'}
                      budgetMin={Math.round(job.budget * 0.8)}
                      budgetMax={job.budget}
                      postedTime="2 days ago"
                      status={job.status === 'completed' ? 'closed' : job.status === 'in_progress' ? 'in_progress' : 'open'}
                      homeownerName={job.homeowner}
                      homeownerAvatarUrl={`https://ui-avatars.com/api/?name=${encodeURIComponent(job.homeowner)}&background=14b8a6&color=fff`}
                      onClick={(id) => {
                        window.location.href = `/jobs/${id}`;
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mini Calendar Widget */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Upcoming Bookings</h3>
                <Link href="/contractor/calendar">
                  <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                    View all
                  </button>
                </Link>
              </div>
              <div className="space-y-3">
                {getUpcomingJobs().length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No upcoming bookings</p>
                  </div>
                ) : (
                  getUpcomingJobs().map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-lg border border-gray-200 hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => {
                        window.location.href = `/contractor/jobs/${job.id}`;
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 bg-teal-50 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xs text-teal-600 font-medium">
                            {job.dueDate
                              ? new Date(job.dueDate).toLocaleDateString('en-GB', {
                                  month: 'short',
                                })
                              : 'TBD'}
                          </span>
                          <span className="text-lg font-bold text-teal-600">
                            {job.dueDate
                              ? new Date(job.dueDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                })
                              : '-'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                            {job.title}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">{job.homeowner}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {job.dueDate
                                ? new Date(job.dueDate).toLocaleDateString('en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Time TBD'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Messages Preview */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Messages</h3>
                <Link href="/messages">
                  <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                    View all
                  </button>
                </Link>
              </div>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No recent messages</p>
                  </div>
                ) : (
                  notifications.slice(0, 4).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                        notification.isRead
                          ? 'border-gray-200 bg-white'
                          : 'border-teal-200 bg-teal-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                          {notification.type === 'message' ? (
                            <MessageSquare className="w-5 h-5" />
                          ) : (
                            <AlertCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 mb-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(notification.timestamp).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContractorPageWrapper>
  );
}
