'use client';

import React, { useState } from 'react';
import { HomeownerPageWrapper } from './HomeownerPageWrapper';
import { formatMoney } from '@/lib/utils/currency';
import Logo from '@/app/components/Logo';
import { HomeownerProfileDropdown } from '@/components/profile/HomeownerProfileDropdown';
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
  Briefcase,
  MapPin,
  MessageSquare,
  Award,
  Zap,
  PoundSterling,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';

interface HomeownerDashboardProfessionalProps {
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

export function HomeownerDashboardProfessional({ data }: HomeownerDashboardProfessionalProps) {
  const { homeowner, metrics, activeJobs, recentActivity } = data;

  // Get upcoming appointments from scheduled jobs
  const upcomingAppointments = activeJobs
    .filter(job => job.scheduledDate && new Date(job.scheduledDate) > new Date())
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
    .slice(0, 3);

  return (
    <HomeownerPageWrapper>
      <div className="space-y-6 pb-12">
        {/* Logo Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo width={40} height={40} />
                <span className="text-xl font-semibold text-gray-900">Mintenance</span>
              </div>
              <HomeownerProfileDropdown
                userName={homeowner.name}
                profileImageUrl={homeowner.avatar}
                initials={homeowner.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              />
            </div>
          </div>
        </div>

        {/* Clean Header - Calendar Style */}
        <section className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex-1">
                <h1 className="text-3xl font-semibold text-gray-900">
                  Hello, {homeowner.name.split(' ')[0]}
                </h1>
                <p className="text-gray-600 mt-1">
                  {metrics.activeJobs > 0
                    ? `You have ${metrics.activeJobs} active ${metrics.activeJobs === 1 ? 'project' : 'projects'} in progress`
                    : 'Your home is all set. Ready to start something new?'}
                </p>
                {homeowner.location && (
                  <div className="flex items-center gap-2 text-gray-500 mt-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{homeowner.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => window.location.href = '/jobs/quick-create'}
                className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Post Quick Job
              </button>

              <button
                onClick={() => window.location.href = '/properties'}
                className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              >
                <Home className="w-5 h-5" />
                Properties
              </button>
            </div>
          </div>
        </section>

        {/* KPI Cards - Slicker Calendar Style */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Jobs */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-teal-600" />
              <p className="text-gray-600 text-sm font-medium">Active Jobs</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{metrics.activeJobs}</p>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <PoundSterling className="w-5 h-5 text-green-600" />
              <p className="text-gray-600 text-sm font-medium">Total Spent</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {formatMoney(metrics.totalSpent, 'GBP')}
            </p>
          </div>

          {/* Completed Projects */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-gray-600 text-sm font-medium">Completed</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{metrics.completedJobs}</p>
          </div>

          {/* Saved Contractors */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-600" />
              <p className="text-gray-600 text-sm font-medium">Saved</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{metrics.savedContractors}</p>
          </div>
        </section>

        {/* Active Jobs Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Active Projects</h2>
              <p className="text-gray-600 mt-1">Track progress on your home improvement projects</p>
            </div>
            <Link
              href="/jobs"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {activeJobs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No active projects</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start your first home improvement project by posting a job and connecting with trusted contractors
              </p>
              <button
                onClick={() => window.location.href = '/jobs/create'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Post Your First Job
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeJobs.map((job) => {
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

                const statusConfig = {
                  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
                  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Progress' },
                  posted: { bg: 'bg-blue-50', text: 'text-blue-700', label: `${job.bidsCount} Bids` },
                  assigned: { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Assigned' }
                }[job.status] || { bg: 'bg-slate-50', text: 'text-slate-700', label: 'Posted' };

                return (
                  <div key={job.id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:border-gray-300">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      <Image
                        src={image}
                        alt={job.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <div className={`px-3 py-1.5 ${statusConfig.bg} ${statusConfig.text} rounded-full text-xs font-medium backdrop-blur-sm`}>
                          {statusConfig.label}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                          {job.title}
                        </h3>
                        {job.category && (
                          <p className="text-sm text-gray-500 font-medium">
                            {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                          </p>
                        )}
                      </div>

                      {/* Contractor */}
                      {job.contractor && (
                        <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                          {job.contractor.image && (
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                              <Image
                                src={job.contractor.image}
                                alt={job.contractor.name}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">Contractor</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {job.contractor.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Progress Bar */}
                      {job.status === 'in_progress' && job.progress > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Progress</span>
                            <span className="text-xs font-semibold text-gray-900">
                              {Math.round(job.progress)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Budget and Schedule */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Budget</p>
                          <p className="text-xl font-semibold text-gray-900">
                            {formatMoney(job.budget, 'GBP')}
                          </p>
                        </div>
                        {job.scheduledDate && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-0.5">Scheduled</p>
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(job.scheduledDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => window.location.href = `/jobs/${job.id}`}
                        className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 group/btn"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Two Column Layout: Quick Actions & Upcoming */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/jobs/quick-create'}
                className="w-full flex items-center gap-4 p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all duration-200 group border border-gray-200"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 mb-0.5">Post Quick Job</div>
                  <div className="text-sm text-gray-600">Simple repairs in seconds</div>
                </div>
                <ArrowRight className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => window.location.href = '/jobs/create'}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-200 group border border-gray-200"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 mb-0.5">Post Detailed Job</div>
                  <div className="text-sm text-gray-600">Complex projects with photos</div>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => window.location.href = '/properties'}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 group border border-gray-200"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 mb-0.5">Manage Properties</div>
                  <div className="text-sm text-gray-600">Track your properties</div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => window.location.href = '/messages'}
                className="w-full flex items-center gap-4 p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 group border border-gray-200"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 mb-0.5">Messages</div>
                  <div className="text-sm text-gray-600">Chat with contractors</div>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer group"
                    onClick={() => window.location.href = `/jobs/${appointment.id}`}
                  >
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="text-2xl font-semibold text-gray-900">
                        {new Date(appointment.scheduledDate!).getDate()}
                      </div>
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        {new Date(appointment.scheduledDate!).toLocaleDateString('en-GB', { month: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        {appointment.title}
                      </div>
                      {appointment.contractor && (
                        <div className="text-sm text-gray-600 mb-1">
                          with {appointment.contractor.name}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {new Date(appointment.scheduledDate!).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity Timeline */}
        {recentActivity.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              <Link
                href="/jobs"
                className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity, index) => {
                const isLast = index === recentActivity.slice(0, 5).length - 1;
                const activityIcon = activity.type === 'job_posted' ? Briefcase : MessageSquare;
                const ActivityIcon = activityIcon;

                return (
                  <div key={activity.id} className="relative">
                    {!isLast && (
                      <div className="absolute left-[19px] top-10 w-0.5 h-full bg-gray-200" />
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center border-4 border-white relative z-10">
                        <ActivityIcon className="w-5 h-5 text-teal-700" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">{activity.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </HomeownerPageWrapper>
  );
}
