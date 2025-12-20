'use client';

import React, { useState, useEffect } from 'react';
import { HomeownerPageWrapper } from './HomeownerPageWrapper';
import { formatMoney } from '@/lib/utils/currency';
import Logo from '@/app/components/Logo';
import { HomeownerProfileDropdown } from '@/components/profile/HomeownerProfileDropdown';
import { AirbnbSearchBar } from './AirbnbSearchBar';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  CheckCircle,
  Home,
  Calendar,
  ArrowRight,
  Star,
  Briefcase,
  MessageSquare,
  PoundSterling,
  Sparkles,
  CalendarDays,
  Wrench,
  Heart
} from 'lucide-react';
import { AgentAutomationPanel } from '@/components/agents/AgentAutomationPanel';

// Category-based fallback images
const categoryImages: Record<string, string> = {
  plumbing: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800',
  electrical: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800',
  carpentry: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800',
  painting: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=800',
  roofing: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800',
  hvac: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800',
  landscaping: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800',
  general: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800',
  default: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800'
};

interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  photos?: string[];
  property_type?: string;
}

interface DashboardWithAirbnbSearchProps {
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
      photoUrl?: string | null;
    }>;
    recentActivity: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
    }>;
  };
}

export function DashboardWithAirbnbSearch({ data }: DashboardWithAirbnbSearchProps) {
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
      .catch(console.error)
      .finally(() => setLoadingProperties(false));
  }, []);

  // Get upcoming appointments from scheduled jobs
  const upcomingAppointments = activeJobs
    .filter(job => job.scheduledDate && new Date(job.scheduledDate) > new Date())
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
    .slice(0, 3);

  // Helper function for relative time
  const toRelativeTimeString = (timestamp: string | Date): string => {
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
  };

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
                initials={(() => {
                  if (!homeowner.name || typeof homeowner.name !== 'string') {
                    return '';
                  }
                  return homeowner.name.split(' ').map(n => n[0]).join('').toUpperCase();
                })()}
              />
            </div>
          </div>
        </div>

        {/* Airbnb-Style Search Section */}
        <section className="bg-gradient-to-b from-white to-gray-50 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {(() => {
                  if (!homeowner.name || typeof homeowner.name !== 'string') {
                    return 'there';
                  }
                  const firstName = homeowner.name.split(' ')[0];
                  return firstName || 'there';
                })()}!
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
              {/* Active Jobs - Nice card design with images */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Active Projects</h2>
                  <Link
                    href="/jobs"
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    View all →
                  </Link>
                </div>
                <p className="text-gray-600 text-sm mb-6">Track progress on your home improvement projects</p>

                {activeJobs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeJobs.slice(0, 4).map((job) => {
                      // Determine image source: use actual job photo, fallback to category image, then default
                      const imageSrc = job.photoUrl 
                        ? job.photoUrl 
                        : (job.category 
                          ? (categoryImages[job.category.toLowerCase()] || categoryImages.default)
                          : categoryImages.default);

                      return (
                        <div
                          key={job.id}
                          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                        >
                          {/* Property Image */}
                          <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                            <Image
                              src={imageSrc}
                              alt={job.title}
                              fill
                              className="object-cover"
                              unoptimized={imageSrc.startsWith('http') && !imageSrc.includes('unsplash.com')}
                            />
                            {job.bidsCount > 0 && (
                              <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                                {job.bidsCount} Bids
                              </div>
                            )}
                          </div>

                          {/* Job Details */}
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>

                            {job.contractor ? (
                              <p className="text-sm text-gray-600 mb-3">{job.contractor.name}</p>
                            ) : (
                              <p className="text-sm text-gray-600 mb-3">Handyman</p>
                            )}

                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm text-gray-500">Budget</p>
                              <p className="text-lg font-bold text-gray-900">{formatMoney(job.budget, 'GBP')}</p>
                            </div>

                            <Link
                              href={`/jobs/${job.id}`}
                              className="block w-full text-center py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                            >
                              View Details →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
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

            {/* Right Column - Quick Links & Activity */}
            <div className="space-y-6">
              {/* Quick Links */}
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl border border-teal-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/properties"
                    className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                  >
                    <Home className="w-6 h-6 text-teal-600" />
                    <span className="text-xs font-medium text-gray-700">Properties</span>
                  </Link>
                  <Link
                    href="/messages"
                    className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                  >
                    <MessageSquare className="w-6 h-6 text-teal-600" />
                    <span className="text-xs font-medium text-gray-700">Messages</span>
                  </Link>
                  <Link
                    href="/payments"
                    className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                  >
                    <PoundSterling className="w-6 h-6 text-teal-600" />
                    <span className="text-xs font-medium text-gray-700">Payments</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                  >
                    <Wrench className="w-6 h-6 text-teal-600" />
                    <span className="text-xs font-medium text-gray-700">Settings</span>
                  </Link>
                </div>
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

              {/* AI Agent Automation */}
              <AgentAutomationPanel />
            </div>
          </div>
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}