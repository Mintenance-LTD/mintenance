'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { SearchBar } from '@/components/SearchBar';
import { Card, LoadingSpinner, ErrorView } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/figma';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';
import { logger } from '@/lib/logger';
import { formatMoney } from '@/lib/utils/currency';
import Logo from '../components/Logo';
import Link from 'next/link';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
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

  // Use HomeownerLayoutShell for homeowners, old layout for contractors
  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  if (user.role === 'homeowner') {
    return (
      <HomeownerLayoutShell
        currentPath="/jobs"
        userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
        userEmail={user.email}
      >
        <div style={{ padding: theme.spacing[6], maxWidth: '1440px', margin: '0 auto' }}>
          {/* Page Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8 -m-8 rounded-2xl mb-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center shadow-sm">
                  <Icon name="briefcase" size={28} color={theme.colors.primary} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                    Your Jobs
                  </h1>
                  <p className="text-base font-medium text-gray-600 leading-relaxed">
                    {allJobs.length} {allJobs.length === 1 ? 'job' : 'jobs'} total
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/jobs/create')}
                className="bg-secondary text-white hover:bg-secondary-600 shadow-md hover:shadow-lg"
              >
                <Icon name="plus" size={20} color="white" />
                New Job
              </Button>
            </div>
          </div>

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
      </HomeownerLayoutShell>
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
  const createdDate = (job as any).createdAt || (job as ProcessedJob).created_at;
  const daysAgo = Math.floor(
    (Date.now() - new Date(createdDate || Date.now()).getTime()) / (1000 * 3600 * 24)
  );
  const hasPhotos = !!(job.photos && job.photos.length > 0);

  // Check if user can pay for this job
  const canPayForJob = user && (
    (user.role === 'homeowner' && job.homeowner_id === user.id && job.status === 'completed') ||
    (user.role === 'contractor' && job.contractor_id === user.id && job.status === 'completed')
  );

  const handlePayNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/jobs/${job.id}/payment`);
  };

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
    // Only navigate if clicking on the card itself, not on interactive elements
    const target = e.target as HTMLElement;

    // Check if click is on a button or other interactive element inside the card
    const clickedButton = target.closest('button');
    const clickedLink = target.closest('a[href]:not(.job-card-interactive)');

    if (clickedButton || clickedLink) {
      // Don't navigate if clicking on Pay Now button or nested links
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Debug logging
    logger.debug('JobCard clicked', { jobId: job.id, url: jobDetailUrl });
  };

  return (
    <Link
      href={jobDetailUrl}
      className="job-card-interactive group bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300 relative overflow-hidden"
      data-job-id={job.id}
      onClick={handleCardClick}
      data-href={jobDetailUrl}
    >
      {/* Gradient bar - appears on hover, always visible on large screens */}
      < div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10" ></div >
      {/* Card Layout: Photo on left, content on right */}
      < div style={{ display: 'flex', gap: theme.spacing[4], alignItems: 'flex-start' }
      }>
        {/* Photo Section - Left Side */}
        < div style={{ flexShrink: 0 }
        }>
          {hasPhotos && job.photos && job.photos.length > 0 ? (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 relative group-hover:shadow-lg transition-shadow duration-300">
              <Image
                src={job.photos[0]}
                alt={`${job.title} - Problem photo`}
                width={200}
                height={150}
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%'
                }}
                loading="lazy"
              />
              {/* Photo count badge if multiple photos */}
              {job.photos.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: theme.spacing[2],
                  right: theme.spacing[2],
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  padding: `${theme.spacing[1]} ${theme.spacing[2.5]}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1.5],
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}>
                  <Icon name="image" size={12} color="white" />
                  {job.photos.length}
                </div>
              )}
            </div>
          ) : (
            <div className="w-[200px] h-[150px] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 group-hover:border-gray-400 transition-colors duration-200">
              <Icon name="image" size={32} color={theme.colors.textSecondary} />
            </div>
          )}
        </div >

        {/* Content Section - Right Side */}
        < div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          {/* Header Row: Title, Priority, Budget */}
          < div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[3] }}>
            <div style={{ flex: 1 }}>
              <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight group-hover:text-primary transition-colors">
                {job.title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], flexWrap: 'wrap' }}>
                {/* Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  <Icon name="clock" size={14} color={theme.colors.textSecondary} />
                  <span style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}>
                    {daysAgo === 0 ? 'Today' :
                      daysAgo === 1 ? '1 day ago' :
                        `${daysAgo} days ago`}
                  </span>
                </div>
                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
                  <span style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {job.location || 'Location not set'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: theme.spacing[1]
            }}>
              <span className="text-2xl font-bold text-primary tracking-tight">
                {formatMoney(Number(job.budget || 0), 'GBP')}
              </span>
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary
              }}>
                Budget
              </span>
            </div>
          </div >

          {/* Description */}
          {
            job.description && (
              <p style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
                lineHeight: 1.6,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {job.description}
              </p>
            )
          }

          {/* Footer: Priority Badge and Status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: theme.spacing[4],
            borderTop: `1px solid ${theme.colors.border}`
          }}>
            <div style={{
              padding: `${theme.spacing[1.5]} ${theme.spacing[3]}`,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
            }}
              className="group-hover:bg-gray-100 transition-colors duration-200"
            >
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.semibold,
                letterSpacing: '0.5px'
              }}>
                {(job.priority || 'NORMAL').toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              {canPayForJob && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    handleInteractiveClick(e);
                    handlePayNow(e);
                  }}
                  className="bg-success text-white hover:bg-success-dark"
                >
                  Pay Now
                </Button>
              )}
              {job.status !== 'all' && (
                <StatusBadge
                  status={job.status === 'completed' ? 'completed' : job.status === 'in_progress' ? 'on_going' : job.status === 'posted' ? 'posted' : 'pending'}
                />
              )}
            </div>
          </div>
        </div >
      </div >
      <style jsx>{`
        .job-card-interactive:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.12);
        }
        .job-card-interactive:active {
          transform: translateY(-2px) scale(0.99);
        }
      `}</style>
    </Link >
  );
};
