'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui';
import { theme } from '@/lib/theme';
import { toJobView, type Job } from '@mintenance/types';

interface JobResultCardProps {
  job: Job;
  onClick: (jobId: string) => void;
}

export function JobResultCard({ job, onClick }: JobResultCardProps) {
  // Audit PKG-P1-4 step 2 (2026-04-26): normalize once at the boundary
  // so the rest of the render uses the canonical camelCase JobView
  // shape. Replaces the previous defensive `job.createdAt ||
  // job.created_at` pattern that papered over the legacy mixed-shape
  // `Job` interface. The Card key falls back to job.id directly so
  // we don't call toJobView on a potentially-malformed row before
  // mounting the Card (which would surface as a render-time throw).
  const view = useMemo(() => {
    try {
      return toJobView(job);
    } catch {
      // Malformed row reaching the search results — render nothing
      // rather than crash. The throw itself is logged via Sentry's
      // automatic error capture once we wire it into the search route.
      return null;
    }
  }, [job]);

  if (!view) return null;

  return (
    <Card
      key={view.id}
      style={{
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        cursor: 'pointer',
      }}
      onClick={() => onClick(view.id)}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.sm,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: '4px',
            }}
          >
            {view.title}
          </h3>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0,
            }}
          >
            {view.location || 'Not specified'} &bull; {view.category}
          </p>
        </div>
        <div
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.success,
          }}
        >
          &pound;{view.budget?.toLocaleString()}
        </div>
      </div>

      <p
        style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.text,
          lineHeight: theme.typography.lineHeight.relaxed,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {view.description}
      </p>

      <div
        style={{
          marginTop: theme.spacing.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          Posted {new Date(view.createdAt).toLocaleDateString('en-GB')}
        </span>
        <div
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.white,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.full,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.bold,
          }}
        >
          {view.urgency?.toUpperCase() || 'NORMAL'} PRIORITY
        </div>
      </div>
    </Card>
  );
}
