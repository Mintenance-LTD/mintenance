'use client';

import { useEffect, useState } from 'react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Icon } from '@/components/ui/Icon';

interface ContractorViewer {
  id: string;
  contractor_id: string;
  viewed_at: string;
  contractor: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    profile_image_url?: string;
  };
}

interface ContractorViewersListProps {
  jobId: string;
}

export function ContractorViewersList({ jobId }: ContractorViewersListProps) {
  const [viewers, setViewers] = useState<ContractorViewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchViewers() {
      try {
        const response = await fetch(`/api/jobs/${jobId}/viewers`);
        if (!response.ok) {
          throw new Error('Failed to fetch viewers');
        }
        const data = await response.json();
        setViewers(data.viewers || []);
      } catch (err) {
        logger.error('Error fetching viewers:', err);
        setError('Failed to load viewers');
      } finally {
        setLoading(false);
      }
    }

    fetchViewers();
  }, [jobId]);

  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <h2 style={{
          margin: 0,
          marginBottom: theme.spacing[4],
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          Contractors Viewing This Job
        </h2>
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[4],
          color: theme.colors.textSecondary,
        }}>
          <Icon name="refresh" size={24} color={theme.colors.textTertiary} />
          <p style={{ marginTop: theme.spacing[2], margin: 0, fontSize: theme.typography.fontSize.sm }}>
            Loading viewers...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <h2 style={{
          margin: 0,
          marginBottom: theme.spacing[4],
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          Contractors Viewing This Job
        </h2>
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[4],
          color: theme.colors.error,
        }}>
          <Icon name="alert" size={24} color={theme.colors.error} />
          <p style={{ marginTop: theme.spacing[2], margin: 0, fontSize: theme.typography.fontSize.sm }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
    }}>
      <h2 style={{
        margin: 0,
        marginBottom: theme.spacing[4],
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.textPrimary,
      }}>
        Contractors Viewing This Job ({viewers.length})
      </h2>

      {viewers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8],
          color: theme.colors.textSecondary,
        }}>
          <Icon name="eye" size={48} color={theme.colors.textTertiary} />
          <p style={{ marginTop: theme.spacing[2], margin: 0, fontSize: theme.typography.fontSize.base }}>
            No contractors have viewed this job yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          {viewers.map((viewer) => {
            const contractor = viewer.contractor;
            const contractorName = contractor?.first_name && contractor?.last_name
              ? `${contractor.first_name} ${contractor.last_name}`
              : 'Unknown Contractor';
            const initials = contractorName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const viewedDate = new Date(viewer.viewed_at);
            const timeAgo = getTimeAgo(viewedDate);

            return (
              <div
                key={viewer.id}
                style={{
                  padding: theme.spacing[4],
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  display: 'flex',
                  gap: theme.spacing[3],
                  alignItems: 'flex-start',
                }}
              >
                {/* Contractor Avatar */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: contractor?.profile_image_url ? 'transparent' : theme.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: 'white',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {contractor?.profile_image_url ? (
                    <img
                      src={contractor.profile_image_url}
                      alt={contractorName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>

                {/* Contractor Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    marginBottom: '2px',
                  }}>
                    {contractorName}
                  </div>
                  {contractor?.email && (
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: '2px',
                    }}>
                      {contractor.email}
                    </div>
                  )}
                  {contractor?.phone && (
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      {contractor.phone}
                    </div>
                  )}
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textTertiary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    marginTop: theme.spacing[1],
                  }}>
                    <Icon name="clock" size={12} color={theme.colors.textTertiary} />
                    Viewed {timeAgo}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}

