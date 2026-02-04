'use client';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import { useCurrentUser } from '@/hooks/useCurrentUser';
// REMOVED: import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MotionArticle, MotionDiv } from '@/components/ui/MotionDiv';
import { logger } from '@mintenance/shared';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  priority: string;
  budget: number;
  status: string;
  photos: string[];
  created_at: string;
  homeowner: {
    id: string;
    name: string;
    avatar?: string;
  };
  distance?: number;
  matchScore?: number;
}

interface JobApiResponse {
  id: string;
  title: string;
  description: string;
  location: string;
  category?: string;
  priority?: string;
  budget: number;
  status: string;
  photos?: string[];
  created_at: string;
  homeowner_id: string;
  homeowner_name?: string;
  homeowner_avatar?: string;
  distance?: number;
  match_score?: number;
}

interface ViewWithJob {
  job: JobApiResponse;
}

interface SavedJobWithJob {
  job: JobApiResponse;
}

export default function ContractorJobsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [filter, setFilter] = useState<'active' | 'viewed' | 'saved' | 'bid'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  // Separate state for KPI stats (all jobs, not filtered)
  const [allJobsStats, setAllJobsStats] = useState({
    active: 0,
    pending: 0,
    completed: 0,
    totalValue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch KPI stats (all jobs for contractor)
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const response = await fetch('/api/contractor/my-jobs?status=all');
        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();
        const allJobs = data.jobs || [];

        const active = allJobs.filter((j: JobApiResponse) => j.status === 'in_progress' || j.status === 'assigned').length;
        const pending = allJobs.filter((j: JobApiResponse) => j.status === 'pending' || j.status === 'posted').length;
        const completed = allJobs.filter((j: JobApiResponse) => j.status === 'completed').length;
        const totalValue = allJobs.reduce((sum: number, j: JobApiResponse) => sum + (j.budget || 0), 0);

        setAllJobsStats({ active, pending, completed, totalValue });
      } catch (error) {
        logger.error('Failed to fetch stats:', error, { service: 'app' });
        // Don't show toast for stats failure, just log it
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  // Fetch contractor's jobs based on filter type
  useEffect(() => {
    if (!user) return;

    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        let endpoint = '';

        switch(filter) {
          case 'viewed':
            endpoint = '/api/contractor/job-views';
            break;
          case 'saved':
            endpoint = '/api/contractor/saved-jobs';
            break;
          case 'bid':
            endpoint = '/api/contractor/my-jobs?status=bid';
            break;
          case 'active':
          default:
            endpoint = '/api/contractor/my-jobs?status=active';
            break;
        }

        const response = await fetch(endpoint);
        
        if (!response.ok) {
          let errorMessage = 'Failed to fetch jobs';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Transform API data based on endpoint type
        let jobsData: JobApiResponse[] = [];

        if (filter === 'viewed' && data.views) {
          jobsData = data.views.map((view: ViewWithJob) => view.job).filter(Boolean);
        } else if (filter === 'saved' && data.savedJobs) {
          jobsData = data.savedJobs.map((saved: SavedJobWithJob) => saved.job).filter(Boolean);
        } else {
          jobsData = data.jobs || [];
        }

        // Apply category filter
        if (categoryFilter && categoryFilter !== 'all') {
          jobsData = jobsData.filter((job: JobApiResponse) =>
            job.category?.toLowerCase() === categoryFilter.toLowerCase()
          );
        }

        const transformedJobs: Job[] = jobsData.map((job: JobApiResponse) => ({
          id: job.id,
          title: job.title,
          description: job.description,
          location: job.location,
          category: job.category || 'General',
          priority: job.priority || 'medium',
          budget: job.budget,
          status: job.status,
          photos: job.photos || [],
          created_at: job.created_at,
          homeowner: {
            id: job.homeowner_id,
            name: job.homeowner_name || 'Unknown',
            avatar: job.homeowner_avatar,
          },
          distance: job.distance,
          matchScore: job.match_score,
        }));

        setJobs(transformedJobs);
      } catch (error) {
        logger.error('Error fetching jobs:', error, { service: 'app' });
        toast.error(error instanceof Error ? error.message : 'Failed to load jobs');
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, [user, filter, categoryFilter]);

  // Redirect if not contractor
  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'contractor')) {
      router.push('/login');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!user) return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-rose-100 text-rose-700 border-rose-600';
      case 'high': return 'bg-emerald-100 text-emerald-700 border-emerald-600';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-600';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-600';
      default: return 'bg-gray-100 text-gray-700 border-gray-600';
    }
  };

  const categories = ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Roofing', 'HVAC', 'Flooring', 'Gardening'];

  return (
    <ContractorPageWrapper>
      {/* Hero Header */}
      <MotionDiv
        className="bg-white border border-gray-200 rounded-xl p-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
            <svg className="w-9 h-9 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Jobs</h1>
            <p className="text-gray-600 text-base">Manage your active projects and bids</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Active Jobs', value: loadingStats ? '...' : allJobsStats.active },
            { label: 'Pending Bids', value: loadingStats ? '...' : allJobsStats.pending },
            { label: 'Completed', value: loadingStats ? '...' : allJobsStats.completed },
            { label: 'Total Value', value: loadingStats ? '...' : `£${allJobsStats.totalValue.toFixed(0)}` },
          ].map((stat) => (
            <MotionDiv
              key={stat.label}
              className="bg-gray-50 rounded-xl p-4 border border-gray-200"
              variants={staggerItem}
            >
              <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </MotionDiv>
          ))}
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-6">
            {/* Filters */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto">
                  {[
                    { label: 'Active', value: 'active' as const, icon: '⚡' },
                    { label: 'Viewed', value: 'viewed' as const, icon: '👁️' },
                    { label: 'Saved', value: 'saved' as const, icon: '⭐' },
                    { label: 'Bid Placed', value: 'bid' as const, icon: '💰' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setFilter(tab.value)}
                      className={`px-6 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                        filter === tab.value
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </MotionDiv>

            {/* Jobs Grid */}
            {loadingJobs ? (
              <LoadingSpinner message="Loading jobs..." />
            ) : jobs.length === 0 ? (
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 p-12 text-center"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs available</h3>
                <p className="text-gray-600">Check back later for new opportunities</p>
              </MotionDiv>
            ) : (
              <MotionDiv
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <AnimatePresence mode="popLayout">
                  {jobs.map((job) => (
                    <MotionArticle
                      key={job.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                      variants={cardHover}
                      initial="rest"
                      whileHover="hover"
                      layout
                    >
                      {/* Image */}
                      {job.photos.length > 0 ? (
                        <div className="relative h-48 bg-gray-200">
                          <img
                            src={job.photos[0]}
                            alt={job.title}
                            className="w-full h-full object-cover"
                          />
                          {job.photos.length > 1 && (
                            <div className="absolute bottom-2 right-2 px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg">
                              +{job.photos.length - 1} photos
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                          <svg className="w-16 h-16 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{job.title}</h3>
                          {job.matchScore && job.matchScore > 80 && (
                            <div className="flex-shrink-0 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                              {job.matchScore}% Match
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{job.description}</p>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-lg capitalize">
                            {job.category}
                          </span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-lg border-2 ${getPriorityColor(job.priority)}`}>
                            {job.priority.toUpperCase()}
                          </span>
                          {job.distance && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                              📍 {job.distance.toFixed(1)} mi
                            </span>
                          )}
                        </div>

                        {/* Budget & Location */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Budget</div>
                            <div className="text-xl font-bold text-gray-900">{formatMoney(job.budget, 'GBP')}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Location</div>
                            <div className="text-sm font-medium text-gray-700">{job.location}</div>
                          </div>
                        </div>

                        {/* Homeowner */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                            {job.homeowner.avatar ? (
                              <img src={job.homeowner.avatar} alt={job.homeowner.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-teal-600 font-semibold">
                                {job.homeowner.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{job.homeowner.name}</div>
                            <div className="text-xs text-gray-500">Homeowner</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <Link
                            href={`/contractor/bid/${job.id}/details`}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200 transition-colors"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/contractor/bid/${job.id}`}
                            className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium text-center hover:bg-teal-700 transition-colors"
                          >
                            Submit Bid
                          </Link>
                        </div>
                      </div>
                    </MotionArticle>
                  ))}
                </AnimatePresence>
              </MotionDiv>
            )}
        </div>
      </div>
    </ContractorPageWrapper>
  );
}
