'use client';

import React, { useState, useEffect } from 'react';
import { HomeownerPageWrapper } from './HomeownerPageWrapper';
import { formatMoney } from '@/lib/utils/currency';
import Logo from '@/app/components/Logo';
import { HomeownerProfileDropdown } from '@/components/profile/HomeownerProfileDropdown';
import { AirbnbSearchBar } from './AirbnbSearchBar';
import Link from 'next/link';
import { logger } from '@/lib/logger';
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
  Sparkles,
  CalendarDays,
  Wrench,
  Heart
} from 'lucide-react';
import Image from 'next/image';

interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  photos?: string[];
  property_type?: string;
}

interface HomeownerDashboardWithSearchProps {
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

export function HomeownerDashboardWithSearch({ data }: HomeownerDashboardWithSearchProps) {
  const { homeowner, metrics, activeJobs, recentActivity } = data;
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Fetch properties for the search bar
  useEffect(() => {
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => {
        if (data.properties) {
          setProperties(data.properties);
        }
      })
      .catch((error) => {
        logger.error('Failed to fetch properties', { error });
      })
      .finally(() => setLoadingProperties(false));
  }, []);

  // Get upcoming appointments from scheduled jobs
  const upcomingAppointments = activeJobs
    .filter(job => job.scheduledDate && new Date(job.scheduledDate) > new Date())
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
    .slice(0, 3);

  // Featured contractors - populated from database
  const featuredContractors: { id: string; name: string; company: string; rating: number; reviews: number; specialties: string[]; image: string; badge: string }[] = [];

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

        {/* Airbnb-Style Search Section */}
        <section className="bg-gradient-to-b from-white to-gray-50 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {homeowner.name.split(' ')[0]}!
              </h1>
              <p className="text-gray-600">What maintenance do you need today?</p>
            </div>

            {/* Airbnb Search Bar */}
            <AirbnbSearchBar properties={properties} />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeJobs}</p>
                    <p className="text-xs text-gray-600">Active Jobs</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{metrics.completedJobs}</p>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <PoundSterling className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMoney(metrics.totalSpent, 'GBP').split('.')[0]}
                    </p>
                    <p className="text-xs text-gray-600">Total Spent</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{metrics.savedContractors}</p>
                    <p className="text-xs text-gray-600">Saved Pros</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Active Jobs & Upcoming */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Jobs */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Active Jobs</h2>
                  <Link
                    href="/jobs"
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    View all
                  </Link>
                </div>

                {activeJobs.length > 0 ? (
                  <div className="space-y-4">
                    {activeJobs.slice(0, 3).map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                            {job.title}
                          </h3>
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full
                            ${job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : ''}
                            ${job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${job.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                          `}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center gap-4">
                            {job.contractor ? (
                              <div className="flex items-center gap-2">
                                <Image
                                  src={job.contractor.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                                  alt={job.contractor.name}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                                <span>{job.contractor.name}</span>
                              </div>
                            ) : (
                              <span>{job.bidsCount} bids</span>
                            )}
                            <span>{formatMoney(job.budget, 'GBP')}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                        </div>

                        {job.progress > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{job.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-teal-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No active jobs</p>
                    <button
                      onClick={() => window.location.href = '/jobs/create'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Post your first job
                    </button>
                  </div>
                )}
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h2>
                  <Link
                    href="/scheduling"
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    View calendar
                  </Link>
                </div>

                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CalendarDays className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{appointment.title}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(appointment.scheduledDate!).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {appointment.contractor && (
                            <p className="text-xs text-gray-500 mt-1">
                              with {appointment.contractor.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No upcoming appointments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Featured Contractors & Quick Actions */}
            <div className="space-y-6">
              {/* Featured Contractors */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Featured Contractors</h2>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>

                <div className="space-y-4">
                  {featuredContractors.map((contractor) => (
                    <Link
                      key={contractor.id}
                      href={`/contractors/${contractor.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <Image
                        src={contractor.image}
                        alt={contractor.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">
                            {contractor.name}
                          </p>
                          {contractor.badge && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              {contractor.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{contractor.rating}</span>
                          </div>
                          <span>({contractor.reviews} reviews)</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {contractor.specialties.join(', ')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/contractors"
                  className="block mt-4 text-center text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Browse all contractors →
                </Link>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{activity.message}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {toRelativeTimeString(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}

// Helper function for relative time
function toRelativeTimeString(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}