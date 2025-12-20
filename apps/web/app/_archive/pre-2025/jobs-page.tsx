'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';
import { logger } from '@/lib/logger';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { PageHeader } from '@/components/layouts/PageHeader';
import { MoreVertical } from 'lucide-react';
import type { Job, User } from '@mintenance/types';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';

// Type for raw job data from API
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

// Type for processed job data
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

export default function JobsPage() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();

  // Set page title
  useEffect(() => {
    document.title = 'Jobs | Mintenance';
  }, []);

  // Fetch user profile for avatar
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch(`/api/users/${user.id}/profile`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use React Query for data fetching
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
    staleTime: 60 * 1000, // 1 minute
  });

  const filteredJobs = useMemo(() => {
    let data = allJobs;
    if (selectedFilter !== 'all') {
      data = data.filter((j) => j.status === selectedFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    return data;
  }, [allJobs, selectedFilter, searchQuery]);

  // Redirect contractors to their bid page
  useEffect(() => {
    if (user && user.role === 'contractor') {
      router.push('/contractor/bid');
    }
  }, [user, router]);

  // Handle redirect when no user - must be called at top level
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

  // Don't render anything for contractors - they're being redirected
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
    return (
      <LoadingSpinner fullScreen message="Redirecting to login..." />
    );
  }

  // Use UnifiedSidebar and PageHeader for homeowners
  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const userAvatar = userProfile?.profile_image_url || (user as any)?.profile_image_url;

  if (user.role === 'homeowner') {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <UnifiedSidebar
          userRole="homeowner"
          userInfo={{
            name: userDisplayName,
            email: user.email,
            avatar: userAvatar,
          }}
        />

        <main className="flex flex-col flex-1 ml-[240px]">
          <PageHeader
            title="Your Jobs"
            darkBackground={true}
            actions={
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/jobs/create')}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Icon name="plus" size={20} color="white" />
                New Job
              </Button>
            }
            userName={userDisplayName}
            userAvatar={userAvatar}
          />

          <div style={{ padding: theme.spacing[6], maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
            {/* Job List for Homeowners */}
            {loading ? (
              <LoadingSpinner message="Loading jobs..." />
            ) : filteredJobs.length === 0 ? (
              <EmptyState
                variant="default"
                icon="briefcase"
                title="No jobs yet"
                description="Use the button above to post your first maintenance job and get competitive quotes from verified contractors in your area."
              />
            ) : (
              <div style={{ display: 'grid', gap: theme.spacing[4] }}>
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} user={user} router={router} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // This should never be reached for contractors (they're redirected above)
  // But keeping as fallback for safety
  return null;
}

interface JobCardProps {
  job: Job | ProcessedJob;
  user: User | null;
  router: ReturnType<typeof useRouter>;
}

const JobCard: React.FC<JobCardProps> = ({ job, user, router }) => {
  const hasPhotos = !!(job.photos && job.photos.length > 0);

  // Ensure job.id exists before rendering
  if (!job.id) {
    logger.error('JobCard: job.id is missing', { job });
    return null;
  }

  // Handle clicks on interactive elements inside the card to prevent navigation
  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const jobDetailUrl = `/jobs/${job.id}`;

  // Handle card click navigation
  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = e.target as HTMLElement;
    const clickedButton = target.closest('button');
    const clickedLink = target.closest('a[href]:not(.job-card-interactive)');

    if (clickedButton || clickedLink) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  // Get status badge color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' }; // Green
      case 'in_progress':
        return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }; // Yellow
      case 'posted':
        return { bg: '#E9D5FF', text: '#6B21A8', border: '#A855F7' }; // Purple
      default:
        return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' }; // Gray
    }
  };

  const statusColor = getStatusColor(job.status || 'posted');
  const statusLabel = job.status === 'completed' ? 'COMPLETED' : 
                     job.status === 'in_progress' ? 'IN PROGRESS' : 
                     job.status === 'posted' ? 'POSTED' : 'PENDING';
  
  // Use shorter status labels for display
  const displayStatusLabel = job.status === 'completed' ? 'DONE' : 
                            job.status === 'in_progress' ? 'ACTIVE' : 
                            job.status === 'posted' ? 'NEW' : 'PENDING';

  return (
    <Link
      href={jobDetailUrl}
      className="job-card-interactive group bg-white rounded-xl border border-gray-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 relative"
      data-job-id={job.id}
      onClick={handleCardClick}
      data-href={jobDetailUrl}
    >
      {/* Card Layout: Photo on left, content on right */}
      <div style={{ display: 'flex', gap: theme.spacing[4], alignItems: 'flex-start' }}>
        {/* Photo Section - Left Side (Small Square) */}
        <div style={{ flexShrink: 0 }}>
          {hasPhotos && job.photos && job.photos.length > 0 ? (
            <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 relative" style={{ width: '100px', height: '100px' }}>
              <Image
                src={job.photos[0]}
                alt={`${job.title} - Problem photo`}
                width={100}
                height={100}
                className="object-cover"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%'
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center" style={{ width: '100px', height: '100px' }}>
              <Icon name="image" size={24} color={theme.colors.textSecondary} />
            </div>
          )}
        </div>

        {/* Content Section - Right Side */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing[2], position: 'relative' }}>
          {/* Top Row: Title, Status Tag, Ellipsis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[2] }}>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight" style={{ flex: 1 }}>
              {job.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              {/* Status Tag */}
              <div
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: statusColor.bg,
                  border: `1px solid ${statusColor.border}`,
                }}
              >
                <span style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: statusColor.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                }}>
                  {displayStatusLabel}
                </span>
              </div>
              {/* Ellipsis Menu */}
              <button
                onClick={handleInteractiveClick}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {job.description}
            </p>
          )}

          {/* Details Line 1: Location and Budget */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4], flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
              <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Location
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: theme.colors.textSecondary,
              }} />
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Budget
              </span>
            </div>
          </div>

          {/* Details Line 2: Actual Location and Budget Values */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4], flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
              <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                {job.location || 'Location not set'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                {formatMoney(Number(job.budget || 0), 'GBP')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
