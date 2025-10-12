'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { JobService } from '@/lib/services/JobService';
import { PageHeader, LoadingSpinner, ErrorView, Card, Button } from '@/components/ui';
import { theme } from '@/lib/theme';
import { logger } from '@/lib/logger';
import type { Job } from '@mintenance/types';

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;
  const { user, loading: loadingUser } = useCurrentUser();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingUser && user && jobId) {
      loadJobDetails();
    }
  }, [jobId, user, loadingUser]);

  const loadJobDetails = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const jobData = await JobService.getJobById(jobId);
      setJob(jobData as any);
    } catch (err: any) {
      logger.error('Error loading job details', err);
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser || loading) {
    return <LoadingSpinner fullScreen message="Loading job details..." />;
  }

  if (error || !job) {
    return (
      <ErrorView
        title="Unable to Load Job"
        message={error || 'Job not found'}
        onRetry={loadJobDetails}
        retryLabel="Try Again"
        variant="fullscreen"
      />
    );
  }

  const isOwner = user?.id === job.homeowner_id;
  const isAssignedContractor = user?.id === job.contractor_id;
  const canEdit = isOwner && job.status === 'posted';
  const canPayForJob = isOwner && job.status === 'completed';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      <PageHeader
        title={job.title}
        subtitle={`${job.status.charAt(0).toUpperCase() + job.status.slice(1)} • ${job.location}`}
        variant="hero"
        actions={
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => router.push(`/jobs/${job.id}/edit`)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: theme.colors.textInverse
                }}
              >
                Edit Job
              </Button>
            )}
            {canPayForJob && (
              <Button
                variant="primary"
                onClick={() => router.push(`/jobs/${job.id}/payment`)}
                style={{
                  backgroundColor: theme.colors.success,
                  borderColor: theme.colors.success
                }}
              >
                💳 Pay Now
              </Button>
            )}
          </div>
        }
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Jobs', href: '/jobs' },
          { label: job.title }
        ]}
      />

      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: `${theme.spacing[6]} ${theme.spacing[6]}`,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: theme.spacing[6] }}>
          {/* Main Content */}
          <div>
            {/* Job Description */}
            <Card style={{ marginBottom: theme.spacing[4] }}>
              <h2 style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[3]
              }}>
                Description
              </h2>
              <p style={{
                fontSize: theme.typography.fontSize.lg,
                color: theme.colors.textSecondary,
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {job.description}
              </p>
            </Card>

            {/* Photos */}
            {job.photos && job.photos.length > 0 && (
              <Card style={{ marginBottom: theme.spacing[4] }}>
                <h2 style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[3]
                }}>
                  Photos ({job.photos.length})
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: theme.spacing[3]
                }}>
                  {job.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Job photo ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: theme.borderRadius.lg
                      }}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Budget Card */}
            <Card style={{ marginBottom: theme.spacing[4] }}>
              <h3 style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[1],
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Budget
              </h3>
              <p style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.primary,
                margin: 0
              }}>
                ${job.budget.toLocaleString()}
              </p>
            </Card>

            {/* Job Details Card */}
            <Card style={{ marginBottom: theme.spacing[4] }}>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[3]
              }}>
                Job Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                <div>
                  <p style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing[1]
                  }}>
                    Status
                  </p>
                  <p style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    margin: 0
                  }}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
                  </p>
                </div>
                {job.category && (
                  <div>
                    <p style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1]
                    }}>
                      Category
                    </p>
                    <p style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      margin: 0
                    }}>
                      {job.category}
                    </p>
                  </div>
                )}
                {job.priority && (
                  <div>
                    <p style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1]
                    }}>
                      Priority
                    </p>
                    <p style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      margin: 0
                    }}>
                      {job.priority.toUpperCase()}
                    </p>
                  </div>
                )}
                <div>
                  <p style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing[1]
                  }}>
                    Posted
                  </p>
                  <p style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    margin: 0
                  }}>
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Actions Card */}
            {user?.role === 'contractor' && !isAssignedContractor && job.status === 'posted' && (
              <Card>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/jobs/${job.id}/bid`)}
                  style={{ width: '100%' }}
                >
                  Place Bid
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
