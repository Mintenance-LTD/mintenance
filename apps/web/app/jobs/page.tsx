'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { SearchBar } from '@/components/SearchBar';
import { Button, Card, PageHeader, LoadingSpinner, ErrorView } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { logger } from '@/lib/logger';
import Logo from '../components/Logo';
import Link from 'next/link';
import type { Job, User } from '@mintenance/types';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';

export default function JobsPage() {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();

  // Set page title
  useEffect(() => {
    document.title = 'Jobs | Mintenance';
  }, []);

  useEffect(() => {
    if (!loadingUser && user) {
      loadJobs();
    }
  }, [user, loadingUser]);

  const loadJobs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const jobsRaw = user.role === 'homeowner'
        ? await JobService.getJobsByHomeowner(user.id)
        : await JobService.getAvailableJobs();

      const jobs: Job[] = (jobsRaw as any[]).map((j: any) => ({
        id: j.id,
        title: j.title ?? '',
        description: j.description ?? '',
        location: j.location ?? '',
        homeowner_id: j.homeowner_id ?? j.homeownerId ?? '',
        contractor_id: j.contractor_id ?? j.contractorId ?? undefined,
        status: j.status ?? 'posted',
        budget: j.budget ?? 0,
        created_at: j.created_at ?? j.createdAt ?? new Date().toISOString(),
        updated_at: j.updated_at ?? j.updatedAt ?? new Date().toISOString(),
        category: j.category ?? undefined,
        priority: j.priority ?? undefined,
        photos: j.photos ?? [],
      }));

      setAllJobs(jobs);
    } catch (error) {
      logger.error('Error loading jobs', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!user) {
    return (
      <ErrorView
        title="Access Denied"
        message="You must be logged in to view this page."
        onRetry={() => window.location.href = '/login'}
        retryLabel="Go to Login"
        variant="fullscreen"
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Logo Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo className="w-10 h-10" />
          <span style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary
          }}>
            Mintenance
          </span>
        </Link>
      </div>

      <PageHeader
        title={user.role === 'homeowner' ? 'Maintenance Hub' : 'Job Marketplace'}
        subtitle={user.role === 'homeowner'
          ? `${allJobs.length} total jobs`
          : `${filteredJobs.length} available opportunities`}
        variant="hero"
        actions={user.role === 'homeowner' ? (
          <Button
            variant="secondary"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: theme.colors.textInverse
            }}
          >
            + New Request
          </Button>
        ) : undefined}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: user.role === 'homeowner' ? 'Jobs' : 'Marketplace' }
        ]}
      />

      {/* Search and Filters for Contractors */}
      {user.role === 'contractor' && (
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: `0 ${theme.spacing[6]}`,
          marginBottom: theme.spacing[6],
        }}>
          <div style={{ marginBottom: theme.spacing[3] }}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search jobs..."
            />
          </div>

          {/* Filter Chips */}
          <div style={{
            display: 'flex',
            gap: theme.spacing[2],
            overflowX: 'auto',
            paddingBottom: theme.spacing[1],
          }}>
            {(['all', 'posted', 'in_progress', 'completed'] as FilterStatus[]).map((key) => (
              <Button
                key={key}
                variant={selectedFilter === key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(key)}
                style={{
                  whiteSpace: 'nowrap',
                  borderRadius: theme.borderRadius.full,
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                {key === 'all' ? 'All' :
                 key === 'in_progress' ? 'In Progress' :
                 key.charAt(0).toUpperCase() + key.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Job List */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: `0 ${theme.spacing[6]}`,
      }}>
        {loading ? (
          <LoadingSpinner message="Loading jobs..." />
        ) : filteredJobs.length === 0 ? (
          <ErrorView
            title="No Jobs"
            message={user.role === 'homeowner'
              ? 'Post your first maintenance job'
              : 'Check back later for new opportunities'}
            variant="inline"
          />
        ) : (
          <div style={{ display: 'grid', gap: theme.spacing[3] }}>
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} user={user} router={router} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  user: User | null;
  router: any;
}

const JobCard: React.FC<JobCardProps> = ({ job, user, router }) => {
  const daysAgo = Math.floor(
    (Date.now() - new Date(job.createdAt || job.created_at || Date.now()).getTime()) / (1000 * 3600 * 24)
  );
  const hasPhotos = !!(job.photos && job.photos.length > 0);

  const statusColor = getStatusColor(job.status);
  const statusIcon = getStatusIcon(job.status);

  // Check if user can pay for this job
  const canPayForJob = user && (
    (user.role === 'homeowner' && job.homeowner_id === user.id && job.status === 'completed') ||
    (user.role === 'contractor' && job.contractor_id === user.id && job.status === 'completed')
  );

  const handlePayNow = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/jobs/${job.id}/payment`);
  };

  return (
    <Card
      style={{ padding: '16px', cursor: 'pointer' }}
      hover={true}
      onClick={() => {
        logger.userAction('Navigate to job', { jobId: job.id });
        router.push(`/jobs/${job.id}`);
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginRight: '8px',
              margin: 0,
              flex: 1
            }}>
              {job.title}
            </h3>
            <div style={{
              backgroundColor: theme.colors.textTertiary,
              paddingLeft: '8px',
              paddingRight: '8px',
              paddingTop: '4px',
              paddingBottom: '4px',
              borderRadius: '12px'
            }}>
              <span style={{
                fontSize: '11px',
                color: theme.colors.textInverse,
                fontWeight: theme.typography.fontWeight.bold
              }}>
                {(job.priority || 'NORMAL').toUpperCase()}
              </span>
            </div>
          </div>
          <p style={{
            fontSize: '13px',
            color: theme.colors.textSecondary,
            margin: 0
          }}>
            {daysAgo === 0 ? 'Today' :
             daysAgo === 1 ? '1 day ago' :
             `${daysAgo} days ago`}
          </p>
        </div>
        <span style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.primary
        }}>
          ${job.budget.toLocaleString()}
        </span>
      </div>

      {/* Photos */}
      {hasPhotos && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <svg width="16" height="16" fill={theme.colors.info} viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.primary,
              fontWeight: theme.typography.fontWeight.semibold
            }}>
              Problem Photos ({job.photos?.length || 0})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {job.photos?.slice(0, 3).map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`Problem photo ${idx + 1}`}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <p style={{
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.textSecondary,
        marginBottom: '12px',
        lineHeight: '22px',
        margin: '0 0 12px 0',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {job.description}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="14" height="14" fill={theme.colors.textTertiary} viewBox="0 0 20 20" style={{ marginRight: '6px' }}>
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            {job.location}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canPayForJob && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePayNow}
              style={{
                backgroundColor: theme.colors.success,
                borderColor: theme.colors.success,
                fontSize: '12px',
                padding: '6px 12px'
              }}
            >
              💳 Pay Now
            </Button>
          )}
          <div style={{
            backgroundColor: statusColor,
            paddingLeft: '12px',
            paddingRight: '12px',
            paddingTop: '6px',
            paddingBottom: '6px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '6px' }}>{statusIcon}</span>
            <span style={{
              fontSize: '13px',
              color: theme.colors.textInverse,
              fontWeight: theme.typography.fontWeight.semibold
            }}>
              {formatStatus(job.status)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'posted':
      return theme.colors.info;
    case 'assigned':
      return '#5856D6';
    case 'in_progress':
      return theme.colors.warning;
    case 'completed':
      return theme.colors.success;
    default:
      return theme.colors.textTertiary;
  }
};

const getStatusIcon = (status: string) => {
  const iconProps = { width: 12, height: 12, fill: theme.colors.white };

  switch (status) {
    case 'posted':
      return <svg {...iconProps} viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>;
    case 'assigned':
      return <svg {...iconProps} viewBox="0 0 20 20"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>;
    case 'in_progress':
      return <svg {...iconProps} viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 0a1 1 0 100 2h.01a1 1 0 100-2H9zm2 0a1 1 0 100 2h.01a1 1 0 100-2H11z" clipRule="evenodd" /></svg>;
    case 'completed':
      return <svg {...iconProps} viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
    default:
      return <svg {...iconProps} viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;
  }
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'posted':
      return 'Open';
    case 'assigned':
      return 'Assigned';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};
