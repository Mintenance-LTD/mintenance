'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { JobService } from '@/lib/services/JobService';
import { LoadingSpinner, ErrorView, UnifiedButton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { SmartJobFilters2025, JobFilters } from './components/SmartJobFilters2025';
import { JobsToolbar, SortOption } from './components/JobsToolbar';
import { BulkActionsBar } from './components/BulkActionsBar';
import { MobileFilterDrawer, MobileFilterButton } from './components/MobileFilterDrawer';
import { JobsStatsSection } from './components/JobsStatsSection';
import { JobsStatusTabs } from './components/JobsStatusTabs';
import { JobsGrid } from './components/JobsGrid';
import { ConfirmationModal } from './components/ConfirmationModal';
import { MotionDiv, MotionButton, MotionSection } from '@/components/ui/MotionDiv';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import type { Job } from '@mintenance/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
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
        view_count: (j as any).view_count,
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

    // Apply sorting
    const sorted = [...data].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'budget-high':
          return b.budget - a.budget;
        case 'budget-low':
          return a.budget - b.budget;
        case 'most-views':
          return (b.view_count || 0) - (a.view_count || 0);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return sorted;
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

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const userAvatar = userProfile?.profile_image_url || (user as any)?.profile_image_url;

  return (
    <HomeownerPageWrapper>
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
          Dashboard
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-semibold">Your Jobs</span>
      </nav>

      {/* Hero Header */}
      <MotionDiv
        className="bg-gradient-to-br from-teal-50 via-white to-emerald-50 border border-gray-200 rounded-2xl p-8 mb-6 relative overflow-hidden"
        initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
        animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
      >
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-100/20 rounded-full blur-3xl" />

        <div className="max-w-full relative z-10">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 text-gray-900">Your Jobs</h1>
              <p className="text-lg text-gray-600">
                Manage maintenance projects and track contractor progress
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/jobs/create')}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl px-8 py-4 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post New Job
            </Button>
          </div>

          {/* Stats Summary */}
          <JobsStatsSection
            totalJobs={allJobs.length}
            activeJobs={allJobs.filter(j => j.status === 'in_progress').length}
            postedJobs={allJobs.filter(j => j.status === 'posted').length}
            completedJobs={allJobs.filter(j => j.status === 'completed').length}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="w-full space-y-6">
          <div className="flex flex-col gap-6">
            {/* JobsToolbar with sorting and view controls */}
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
                if (selectionMode) {
                  setSelectedJobs(new Set());
                }
              }}
            />

            {/* Status Tabs */}
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

            {/* Filters - Desktop */}
            <div className="hidden lg:block">
              <SmartJobFilters2025
                onFilterChange={setFilters}
                initialFilters={filters}
              />
            </div>

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
              isOpen={showMobileFilters}
              onClose={() => setShowMobileFilters(false)}
              activeFilterCount={Object.keys(filters).length}
            >
              <SmartJobFilters2025
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                }}
                initialFilters={filters}
              />
            </MobileFilterDrawer>

            {/* Jobs Grid/List - ✅ ACCESSIBILITY: Accessible animations */}
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
                if (newSelected.has(jobId)) {
                  newSelected.delete(jobId);
                } else {
                  newSelected.add(jobId);
                }
                setSelectedJobs(newSelected);
              }}
              onClearFilters={() => setFilters({})}
            />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectionMode && selectedJobs.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedJobs.size}
            onArchive={async () => {
              setBulkActionLoading(true);
              try {
                // Archive selected jobs
                const archivePromises = Array.from(selectedJobs).map(jobId =>
                  fetch(`/api/jobs/${jobId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'archived' })
                  })
                );
                await Promise.all(archivePromises);

                // Refresh jobs list
                window.location.reload();
              } catch (error) {
                logger.error('Error archiving jobs', error);
                alert('Failed to archive some jobs. Please try again.');
              } finally {
                setBulkActionLoading(false);
                setSelectionMode(false);
                setSelectedJobs(new Set());
              }
            }}
            onExport={async () => {
              setBulkActionLoading(true);
              try {
                // Get selected job details
                const selectedJobDetails = filteredJobs.filter(job => selectedJobs.has(job.id));

                // Create PDF export (basic implementation)
                const exportData = selectedJobDetails.map(job => ({
                  title: job.title,
                  description: job.description,
                  location: job.location,
                  budget: `£${job.budget.toLocaleString()}`,
                  status: job.status,
                  created: new Date(job.created_at).toLocaleDateString()
                }));

                // Convert to CSV for now (PDF would require jsPDF library)
                const csv = [
                  ['Title', 'Description', 'Location', 'Budget', 'Status', 'Created'],
                  ...exportData.map(job => [
                    job.title,
                    job.description,
                    job.location,
                    job.budget,
                    job.status,
                    job.created
                  ])
                ].map(row => row.join(',')).join('\n');

                // Download CSV
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (error) {
                logger.error('Error exporting jobs', error);
                alert('Failed to export jobs. Please try again.');
              } finally {
                setBulkActionLoading(false);
              }
            }}
            onDelete={() => {
              setShowDeleteModal(true);
            }}
            onCancel={() => {
              setSelectionMode(false);
              setSelectedJobs(new Set());
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          setBulkActionLoading(true);
          try {
            // Delete selected jobs
            const deletePromises = Array.from(selectedJobs).map(jobId =>
              fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
            );
            await Promise.all(deletePromises);

            // Refresh jobs list
            window.location.reload();
          } catch (error) {
            logger.error('Error deleting jobs', error);
            alert('Failed to delete some jobs. Please try again.');
          } finally {
            setBulkActionLoading(false);
            setShowDeleteModal(false);
            setSelectionMode(false);
            setSelectedJobs(new Set());
          }
        }}
        title="Delete Jobs"
        message={`Are you sure you want to delete ${selectedJobs.size} job(s)? This action cannot be undone and will permanently remove all job data, including bids and messages.`}
        confirmLabel="Delete Jobs"
        cancelLabel="Cancel"
        variant="danger"
        loading={bulkActionLoading}
      />

      {/* Mobile Filter Button */}
      <MobileFilterButton
        activeFilterCount={Object.keys(filters).length}
        onClick={() => setShowMobileFilters(true)}
      />
    </HomeownerPageWrapper>
  );
}
