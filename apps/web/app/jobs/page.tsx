'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { SearchBar } from '@/components/SearchBar';
import { Button, Card, PageHeader, LoadingSpinner, ErrorView } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
          <Logo />
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
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: '20px',
        border: `1px solid ${theme.colors.border}`,
        padding: theme.spacing[5],
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onClick={() => {
        logger.userAction('Navigate to job', { jobId: job.id });
        router.push(`/jobs/${job.id}`);
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing[3] }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[1] }}>
            <h3 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
              flex: 1
            }}>
              {job.title}
            </h3>
            <div style={{
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              borderRadius: '12px',
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
            }}>
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.semibold,
              }}>
                {(job.priority || 'NORMAL').toUpperCase()}
              </span>
            </div>
          </div>
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
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: theme.spacing[1]
        }}>
          <span style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary
          }}>
            ${job.budget.toLocaleString()}
          </span>
          <span style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary
          }}>
            Budget
          </span>
        </div>
      </div>

      {/* Photos */}
      {hasPhotos && (
        <div style={{ marginBottom: theme.spacing[4] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
            <Icon name="image" size={16} color={theme.colors.info} />
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.info,
              fontWeight: theme.typography.fontWeight.semibold
            }}>
              Problem Photos ({job.photos?.length || 0})
            </span>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing[2], overflowX: 'auto', paddingBottom: theme.spacing[1] }}>
            {job.photos?.slice(0, 3).map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`Problem photo ${idx + 1}`}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: `1px solid ${theme.colors.border}`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <p style={{
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.textSecondary,
        lineHeight: 1.6,
        margin: `0 0 ${theme.spacing[4]} 0`,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {job.description}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing[4],
        borderTop: `1px solid ${theme.colors.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
          <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            {job.location}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          {canPayForJob && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePayNow}
              style={{
                backgroundColor: theme.colors.success,
                borderColor: theme.colors.success,
              }}
            >
              Pay Now
            </Button>
          )}
          <StatusBadge status={job.status} size="sm" />
        </div>
      </div>
    </div>
  );
};
