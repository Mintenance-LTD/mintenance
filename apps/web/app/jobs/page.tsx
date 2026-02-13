'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { JobService } from '@/lib/services/JobService';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { SmartJobFilters2025, JobFilters } from './components/SmartJobFilters2025';
import { JobsToolbar, SortOption } from './components/JobsToolbar';
import { MobileFilterDrawer, MobileFilterButton } from './components/MobileFilterDrawer';
import { JobsStatusTabs } from './components/JobsStatusTabs';
import { JobsGrid } from './components/JobsGrid';
import { JobsHeroHeader } from './components/JobsHeroHeader';
import { JobsBulkActionsSection } from './components/JobsBulkActionsSection';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  view_count?: number;
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
  view_count?: number;
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
  const prefersReducedMotion = useReducedMotion();
  const [filters, setFilters] = useState<JobFilters>({});
  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();

  useEffect(() => {
    document.title = 'Your Jobs | Mintenance';
  }, []);

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
        view_count: j.view_count,
      }));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const filteredJobs = useMemo(() => {
    let data = allJobs;
    if (activeTab !== 'all') {
      // "Active" tab (in_progress) should also include 'assigned' status jobs
      if (activeTab === 'in_progress') {
        data = data.filter((j) => j.status === 'in_progress' || j.status === 'assigned');
      } else {
        data = data.filter((j) => j.status === activeTab);
      }
    }
    if (filters.status && filters.status.length > 0 && !filters.status.includes('all')) {
      data = data.filter((j) => filters.status?.includes(j.status));
    }
    if (filters.category && filters.category.length > 0) {
      data = data.filter((j) => j.category && filters.category?.includes(j.category));
    }
    if (filters.urgency && filters.urgency.length > 0) {
      data = data.filter((j) => j.priority && filters.urgency?.includes(j.priority));
    }
    if (filters.budgetRange) {
      data = data.filter(
        (j) =>
          j.budget >= (filters.budgetRange?.min || 0) &&
          j.budget <= (filters.budgetRange?.max || Infinity)
      );
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      data = data.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    return [...data].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'budget-high': return b.budget - a.budget;
        case 'budget-low': return a.budget - b.budget;
        case 'most-views': return (b.view_count || 0) - (a.view_count || 0);
        case 'alphabetical': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });
  }, [allJobs, filters, activeTab, sortBy]);

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

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedJobs(new Set());
  };

  return (
    <HomeownerPageWrapper>
      <JobsHeroHeader
        allJobsCount={allJobs.length}
        activeJobsCount={allJobs.filter(j => j.status === 'in_progress').length}
        postedJobsCount={allJobs.filter(j => j.status === 'posted').length}
        completedJobsCount={allJobs.filter(j => j.status === 'completed').length}
        prefersReducedMotion={prefersReducedMotion}
      />

      <div className="w-full space-y-6">
        <div className="flex flex-col gap-6">
          <JobsToolbar
            totalCount={allJobs.length}
            activeCount={filteredJobs.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectionMode={selectionMode}
            onToggleSelectionMode={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedJobs(new Set());
            }}
          />

          <JobsStatusTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            jobCounts={{
              all: allJobs.length,
              posted: allJobs.filter(j => j.status === 'posted').length,
              active: allJobs.filter(j => j.status === 'in_progress' || j.status === 'assigned').length,
              completed: allJobs.filter(j => j.status === 'completed').length,
              draft: allJobs.filter(j => j.status === 'draft').length,
            }}
            prefersReducedMotion={prefersReducedMotion}
          />

          <div className="hidden lg:block">
            <SmartJobFilters2025 onFilterChange={setFilters} initialFilters={filters} />
          </div>

          <MobileFilterDrawer
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
            activeFilterCount={Object.keys(filters).length}
          >
            <SmartJobFilters2025 onFilterChange={setFilters} initialFilters={filters} />
          </MobileFilterDrawer>

          <JobsGrid
            jobs={filteredJobs}
            allJobsCount={allJobs.length}
            loading={loading}
            viewMode={viewMode}
            prefersReducedMotion={prefersReducedMotion}
            selectionMode={selectionMode}
            selectedJobs={selectedJobs}
            onToggleSelection={(jobId) => {
              const newSelected = new Set(selectedJobs);
              if (newSelected.has(jobId)) { newSelected.delete(jobId); }
              else { newSelected.add(jobId); }
              setSelectedJobs(newSelected);
            }}
            onClearFilters={() => setFilters({})}
          />
        </div>
      </div>

      <JobsBulkActionsSection
        selectionMode={selectionMode}
        selectedJobs={selectedJobs}
        filteredJobs={filteredJobs}
        onCancelSelection={handleCancelSelection}
      />

      <MobileFilterButton
        activeFilterCount={Object.keys(filters).length}
        onClick={() => setShowMobileFilters(true)}
      />
    </HomeownerPageWrapper>
  );
}
