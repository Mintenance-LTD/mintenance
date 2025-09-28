'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { SearchBar } from '@/components/SearchBar';
import { Button, Card } from '@/components/ui';
import { theme } from '@/lib/theme';
import type { Job, User } from '@mintenance/types';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';

export default function JobsPage() {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();

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
      console.error('Error loading jobs:', error);
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>Loading your workspace...</div>
      </div>
    );
  }

  if (currentUserError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>Unable to load account</h1>
          <p style={{ color: theme.colors.textSecondary }}>Please refresh the page or try signing in again.</p>
          <a href="/login" style={{ color: theme.colors.primary, textDecoration: 'none' }}>Go to Login</a>
        </div>
      </div>
    );
  }

  if (!user) {  return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>
            Access Denied
          </h1>
          <p style={{ color: theme.colors.textSecondary }}>You must be logged in to view this page.</p>
          <a href="/login" style={{ color: theme.colors.primary, textDecoration: 'none' }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.surfaceSecondary }}>
      {/* Header */}
      <div style={{ backgroundColor: theme.colors.primary, paddingTop: '60px', paddingBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingLeft: '20px',
          paddingRight: '20px',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textInverse,
              marginBottom: '4px',
              margin: 0
            }}>
              {user.role === 'homeowner' ? 'Maintenance Hub' : 'Job Marketplace'}
            </h1>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textInverseMuted,
              fontWeight: theme.typography.fontWeight.medium,
              margin: 0
            }}>
              {user.role === 'homeowner'
                ? `${allJobs.length} total jobs`
                : `${filteredJobs.length} available opportunities`}
            </p>
          </div>
          {user.role === 'homeowner' && (
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
          )}
        </div>

        {/* Search and Filters for Contractors */}
        {user.role === 'contractor' && (
          <div style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search jobs..."
              />
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {(['all', 'posted', 'in_progress', 'completed'] as FilterStatus[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key)}
                  style={{
                    backgroundColor: selectedFilter === key
                      ? 'rgba(255, 255, 255, 0.25)'
                      : 'rgba(255, 255, 255, 0.15)',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    borderRadius: '20px',
                    border: `1px solid ${
                      selectedFilter === key
                        ? 'rgba(255, 255, 255, 0.5)'
                        : 'rgba(255, 255, 255, 0.3)'
                    }`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textInverse,
                    fontWeight: theme.typography.fontWeight.medium,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  {key === 'all' ? 'All' :
                   key === 'in_progress' ? 'In Progress' :
                   key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Job List */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: `3px solid ${theme.colors.border}`,
              borderTop: `3px solid ${theme.colors.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: theme.colors.textSecondary }}>Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: '12px'
            }}>
              No Jobs
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textSecondary,
              lineHeight: theme.typography.lineHeight.relaxed,
              maxWidth: '280px',
              margin: '0 auto'
            }}>
              {user.role === 'homeowner'
                ? 'Post your first maintenance job'
                : 'Check back later for new opportunities'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} user={user} router={router} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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
        // TODO: Navigate to job details
        console.log('Navigate to job:', job.id);
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
