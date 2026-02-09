'use client';

import { Card } from '@/components/ui';
import { theme } from '@/lib/theme';
import type { Job } from '@mintenance/types';

interface JobResultCardProps {
  job: Job;
  onClick: (jobId: string) => void;
}

export function JobResultCard({ job, onClick }: JobResultCardProps) {
  return (
    <Card
      key={job.id}
      style={{
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        cursor: 'pointer'
      }}
      onClick={() => onClick(job.id)}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm
      }}>
        <div>
          <h3 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: '4px'
          }}>
            {job.title}
          </h3>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0
          }}>
            {job.location} &bull; {job.category}
          </p>
        </div>
        <div style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.success
        }}>
          &pound;{job.budget?.toLocaleString()}
        </div>
      </div>

      <p style={{
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text,
        lineHeight: theme.typography.lineHeight.relaxed,
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {job.description}
      </p>

      <div style={{
        marginTop: theme.spacing.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary
        }}>
          Posted {new Date(job.createdAt || job.created_at || new Date()).toLocaleDateString('en-GB')}
        </span>
        <div style={{
          backgroundColor: theme.colors.primary,
          color: theme.colors.white,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderRadius: theme.borderRadius.full,
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.bold
        }}>
          {job.priority?.toUpperCase() || 'NORMAL'} PRIORITY
        </div>
      </div>
    </Card>
  );
}
