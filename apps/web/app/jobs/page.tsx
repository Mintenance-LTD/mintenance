'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { LoadingSpinner, ErrorView, UnifiedButton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { JobCard2025 } from './components/JobCard2025';
import { SmartJobFilters2025, JobFilters } from './components/SmartJobFilters2025';
import { MotionDiv, MotionButton, MotionSection } from '@/components/ui/MotionDiv';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import type { Job } from '@mintenance/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { JobCardSkeleton } from '@/components/ui/skeletons';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed' | 'draft';

interface RawJobData {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  homeowner_id?: string;
  homeownerId?: string;
  contractor_id?: string;
  contractorId?: string;
  status?: string;
  budget?: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  category?: string;
  priority?: string;
  photos?: string[];
}

interface ProcessedJob {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string;
  contractor_id?: string;
  status: FilterStatus;
  budget: number;
  created_at: string;
  updated_at: string;
  category?: string;
  priority?: string;
  photos: string[];
}

export default function JobsPage2025() {
  return (
    <ErrorBoundary componentName="JobsPage">
      <JobsPageContent />
    </ErrorBoundary>
  );
}

function JobsPageContent() {
  const router = useRouter();
  const [filters, setFilters] = useState<JobFilters>({});
  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();

  useEffect(() => {
    document.title = 'Your Jobs | Mintenance';
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch(`/api/users/${user.id}/profile`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allJobs = [], isLoading: loading, error: jobsError } = useQuery({
    queryKey: ['jobs', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];

      const jobsRaw = user.role === 'homeowner'
        ? await JobService.getJobsByHomeowner(user.id)
        : await JobService.getAvailableJobs();

      return (jobsRaw as RawJobData[]).map((j: RawJobData): ProcessedJob => ({
        id: j.id,
        title: j.title ?? '',
        description: j.description ?? '',
        location: j.location ?? '',
        homeowner_id: j.homeowner_id ?? j.homeownerId ?? '',
        contractor_id: j.contractor_id ?? j.contractorId ?? undefined,
        status: (j.status as FilterStatus) ?? 'posted',
        budget: j.budget ?? 0,
        created_at: j.created_at ?? j.createdAt ?? new Date().toISOString(),
        updated_at: j.updated_at ?? j.updatedAt ?? new Date().toISOString(),
        category: j.category ?? undefined,
        priority: j.priority ?? undefined,
        photos: j.photos ?? [],
      }));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const filteredJobs = useMemo(() => {
    let data = allJobs;

    // Apply tab filter first
    if (activeTab !== 'all') {
      data = data.filter((j) => j.status === activeTab);
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0 && !filters.status.includes('all')) {
      data = data.filter((j) => filters.status?.includes(j.status));
    }

    // Apply category filter
    if (filters.category && filters.category.length > 0) {
      data = data.filter((j) => j.category && filters.category?.includes(j.category));
    }

    // Apply urgency filter
    if (filters.urgency && filters.urgency.length > 0) {
      data = data.filter((j) => j.priority && filters.urgency?.includes(j.priority));
    }

    // Apply budget range filter
    if (filters.budgetRange) {
      data = data.filter(
        (j) =>
          j.budget >= (filters.budgetRange?.min || 0) &&
          j.budget <= (filters.budgetRange?.max || Infinity)
      );
    }

    // Apply search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      data = data.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }

    return data;
  }, [allJobs, filters, activeTab]);

  useEffect(() => {
    if (user && user.role === 'contractor') {
      router.push('/contractor/bid');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user && !loadingUser && !currentUserError) {
      const redirectTo = `/login?redirect=/jobs&message=${encodeURIComponent('Please sign in to view available jobs')}`;
      router.push(redirectTo);
    }
  }, [user, loadingUser, currentUserError, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading your workspace..." />;
  }

  if (currentUserError) {
    return (
      <ErrorView
        title="Unable to load account"
        message="Please refresh the page or try signing in again."
        onRetry={() => window.location.reload()}
        retryLabel="Refresh Page"
        variant="fullscreen"
      />
    );
  }

  if (user && user.role === 'contractor') {
    return <LoadingSpinner fullScreen message="Redirecting to bid page..." />;
  }

  if (jobsError) {
    return (
      <ErrorView
        title="Unable to load jobs"
        message="There was an error loading your jobs. Please try again."
        onRetry={() => window.location.reload()}
        retryLabel="Refresh Page"
        variant="fullscreen"
      />
    );
  }

  if (!user) {
    return <LoadingSpinner fullScreen message="Redirecting to login..." />;
  }

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const userAvatar = userProfile?.profile_image_url || (user as any)?.profile_image_url;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="homeowner"
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: userAvatar,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header - ✅ ACCESSIBILITY: Respects reduced motion preferences */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <MotionDiv
                  className="text-4xl font-bold mb-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h1>Your Jobs</h1>
                </MotionDiv>
                <MotionDiv
                  className="text-teal-100 text-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p>Manage your maintenance projects in one place</p>
                </MotionDiv>
              </div>

              <MotionDiv
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/jobs/create')}
                  className="bg-white text-teal-600 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Post New Job
                </Button>
              </MotionDiv>
            </div>

            {/* Stats Summary */}
            <MotionDiv
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {[
                { label: 'Total Jobs', value: allJobs.length, icon: '📋' },
                { label: 'Active', value: allJobs.filter(j => j.status === 'in_progress').length, icon: '⚡' },
                { label: 'Posted', value: allJobs.filter(j => j.status === 'posted').length, icon: '📢' },
                { label: 'Completed', value: allJobs.filter(j => j.status === 'completed').length, icon: '✅' },
              ].map((stat, index) => (
                <MotionDiv
                  key={stat.label}
                  variants={staggerItem}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <div className="text-teal-100 text-sm">{stat.label}</div>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          <div className="flex flex-col gap-6">
            {/* Tabs and View Toggle */}
            <MotionDiv
              className="flex items-center justify-between gap-4 flex-wrap"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              {/* Status Tabs */}
              <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
                {[
                  { value: 'all', label: 'All Jobs', count: allJobs.length },
                  { value: 'posted', label: 'Posted', count: allJobs.filter(j => j.status === 'posted').length },
                  { value: 'in_progress', label: 'Active', count: allJobs.filter(j => j.status === 'in_progress' || j.status === 'assigned').length },
                  { value: 'completed', label: 'Completed', count: allJobs.filter(j => j.status === 'completed').length },
                  { value: 'draft', label: 'Drafts', count: allJobs.filter(j => j.status === 'draft').length },
                ].map((tab) => (
                  <MotionButton
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value as FilterStatus)}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      activeTab === tab.value
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={`Filter by ${tab.label}`}
                    aria-pressed={activeTab === tab.value}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === tab.value
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </MotionButton>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-teal-100 text-teal-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-teal-100 text-teal-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </MotionDiv>

            {/* Filters */}
            <SmartJobFilters2025
              onFilterChange={setFilters}
              initialFilters={filters}
            />

            {/* Jobs Grid/List - ✅ ACCESSIBILITY: Accessible animations */}
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
                <JobCardSkeleton count={6} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <MotionDiv
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                {allJobs.length === 0 ? (
                  <EmptyState
                    variant="illustrated"
                    icon="briefcase"
                    title="Post your first job"
                    description="Bring vetted contractors to you by publishing clear, complete job briefs. We’ll match you with pros in minutes."
                    actionLabel="Create Job"
                    onAction={() => router.push('/jobs/create')}
                    secondaryActionLabel="Browse contractors"
                    onSecondaryAction={() => router.push('/contractors')}
                    nextSteps={[
                      {
                        title: 'Complete your business profile',
                        description: 'Add company details, licenses, and photos so homeowners trust your bids.',
                        href: '/settings/profile',
                      },
                      {
                        title: 'Enable Jobs Near You',
                        description: 'Turn on location-based alerts to see urgent work in your service radius.',
                        href: '/contractor/jobs-near-you',
                      },
                    ]}
                    supportLink={{ label: 'Need help? support@mintenance.co.uk', href: 'mailto:support@mintenance.co.uk' }}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs match your filters</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters to see more results</p>
                    <button
                      onClick={() => setFilters({})}
                      className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </MotionDiv>
            ) : (
              <MotionDiv
                className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <AnimatePresence mode="popLayout">
                  {filteredJobs.map((job, index) => (
                    <MotionDiv
                      key={job.id}
                      variants={staggerItem}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <JobCard2025 job={job} viewMode={viewMode} />
                    </MotionDiv>
                  ))}
                </AnimatePresence>
              </MotionDiv>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
