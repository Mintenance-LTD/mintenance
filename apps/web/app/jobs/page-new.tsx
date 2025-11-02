'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { JobsTable, type Job } from './components/JobsTable';
import { JobsFilters } from './components/JobsFilters';
import Link from 'next/link';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent';

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


export default function JobsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('all');
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();

  // Use React Query for data fetching
  const { data: allJobs = [], isLoading: loading, error: jobsError } = useQuery({
    queryKey: ['jobs', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      
      const jobsRaw = user.role === 'homeowner'
        ? await JobService.getJobsByHomeowner(user.id)
        : await JobService.getAvailableJobs();

      return (jobsRaw as RawJobData[]).map((j: RawJobData): Job => ({
        id: j.id,
        title: j.title ?? 'Untitled Job',
        description: j.description ?? '',
        location: j.location ?? '',
        customer: 'John Doe', // Mock data - should come from API
        property: j.location ?? '',
        homeowner_id: j.homeowner_id ?? j.homeownerId ?? '',
        contractor_id: j.contractor_id ?? j.contractorId ?? undefined,
        status: (j.status as any) ?? 'posted',
        budget: j.budget ?? 0,
        created_at: j.created_at ?? j.createdAt ?? new Date().toISOString(),
        updated_at: j.updated_at ?? j.updatedAt ?? new Date().toISOString(),
        category: j.category ?? undefined,
        priority: (j.priority as any) ?? undefined,
        photos: j.photos ?? [],
        assignedTo: j.contractor_id ? 'Contractor Name' : undefined,
        scheduledDate: j.created_at ? new Date(j.created_at).toLocaleDateString() : undefined,
      }));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const filteredJobs = useMemo(() => {
    let data = allJobs;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      data = data.filter((j) => j.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      data = data.filter((j) => j.priority === priorityFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          (j.customer && j.customer.toLowerCase().includes(q))
      );
    }
    
    return data;
  }, [allJobs, statusFilter, priorityFilter, searchQuery]);

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
    router.push(`/login?redirect=/jobs&message=${encodeURIComponent('Please sign in to view available jobs')}`);
    return <LoadingSpinner fullScreen message="Redirecting to login..." />;
  }

  const handleRowClick = (job: Job) => {
    router.push(`/jobs/${job.id}`);
  };

  return (
    <HomeownerLayoutShell 
      currentPath="/jobs"
      userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user.email}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: theme.spacing[4],
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              marginBottom: theme.spacing[1],
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Jobs
            </h1>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} • {allJobs.filter(j => j.status === 'in_progress').length} in progress
            </p>
          </div>
          <Link href="/jobs/create" style={{ textDecoration: 'none' }}>
            <button style={{
              height: '40px',
              padding: `0 ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.lg,
              border: 'none',
              backgroundColor: theme.colors.primary,
              color: 'white',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              transition: 'all 0.2s',
            }}>
              <Icon name="plus" size={16} color="white" />
              New Job
            </button>
          </Link>
        </div>

        {/* Filters */}
        <JobsFilters
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => setStatusFilter(status as FilterStatus)}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={(priority) => setPriorityFilter(priority as FilterPriority)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Table */}
        {loading ? (
          <div style={{ padding: theme.spacing[8], textAlign: 'center' }}>
            <LoadingSpinner message="Loading jobs..." />
          </div>
        ) : (
          <JobsTable jobs={filteredJobs} onRowClick={handleRowClick} />
        )}
      </div>
    </HomeownerLayoutShell>
  );
}

