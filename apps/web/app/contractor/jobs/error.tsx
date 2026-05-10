'use client';

import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /contractor/jobs.
 * Logs to the structured logger on mount; dev shows the underlying
 * message. Added 2026-05-10 (AUDIT_PUNCH_LIST P3 #81).
 */
export default function ContractorJobsError({ error, reset }: ErrorPageProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    logger.error(
      'Contractor jobs page failed to load',
      { error: error.message, digest: error.digest },
      { service: 'web.contractor-jobs' }
    );
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        padding: '1rem',
      }}
    >
      <Card
        variant='elevated'
        style={{
          maxWidth: '600px',
          width: '100%',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            marginBottom: '1rem',
            color: theme.colors.error,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <AlertCircle size={64} strokeWidth={1.5} />
        </div>

        <h1
          style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: theme.colors.textPrimary,
            marginBottom: '1rem',
          }}
        >
          Couldn&apos;t load your jobs
        </h1>

        <p
          style={{
            fontSize: '1rem',
            color: theme.colors.textSecondary,
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}
        >
          We hit a transient error fetching your job list. Try again in a
          moment.
        </p>

        {isDevelopment && error && (
          <details
            // bg-gray-100 + border-gray-200 via Tailwind so this file
            // doesn't carry hex literals — pre-commit `check-no-hex`
            // grandfathers /theme/ paths but flags new style-context
            // hex anywhere else.
            className='bg-gray-100 border border-gray-200'
            style={{
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '2rem',
              textAlign: 'left',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: theme.colors.textPrimary,
              }}
            >
              Error Details
            </summary>
            <p
              style={{
                fontSize: '0.875rem',
                color: theme.colors.error,
                marginTop: '0.5rem',
              }}
            >
              {error.message}
            </p>
          </details>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button variant='primary' onClick={reset}>
            Try Again
          </Button>
          <Button
            variant='outline'
            onClick={() => (window.location.href = '/contractor/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
