'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';

interface DiscoverEmptyStateProps {
  userRole?: 'contractor' | 'homeowner' | 'admin';
  onRestart: () => void;
}

/**
 * Empty state component shown when all items have been reviewed (swipe mode)
 */
export function DiscoverEmptyState({
  userRole,
  onRestart,
}: DiscoverEmptyStateProps) {
  const isContractor = userRole === 'contractor';

  return (
    <div
      data-theme='mint-editorial'
      style={{
        textAlign: 'center',
        padding: '80px 40px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      <div
        style={{
          fontSize: '64px',
          marginBottom: theme.spacing[4],
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <svg
          className='w-16 h-16'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          style={{ color: 'var(--me-brand)' }}
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      </div>
      <h2
        style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: 'var(--me-ink)',
          fontFamily: 'var(--me-font-display)',
          marginBottom: theme.spacing[2],
        }}
      >
        All Done!
      </h2>
      <p
        style={{
          fontSize: theme.typography.fontSize.xl,
          color: 'var(--me-ink-2)',
          lineHeight: theme.typography.lineHeight.relaxed,
          marginBottom: theme.spacing[6],
        }}
      >
        {isContractor
          ? "You've reviewed all available jobs. Check back later for new opportunities or browse all jobs."
          : "You've seen all available contractors in your area. Check back later for new professionals."}
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
          alignItems: 'center',
        }}
      >
        {isContractor ? (
          <>
            <Link
              href='/contractor/jobs-near-you'
              style={{
                display: 'inline-block',
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: 'var(--me-shadow-btn)',
              }}
            >
              Browse All Jobs
            </Link>
            <button
              onClick={onRestart}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'transparent',
                color: 'var(--me-ink)',
                border: '1px solid var(--me-line)',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Start Over
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onRestart}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'var(--me-shadow-btn)',
              }}
            >
              Start Over
            </button>
            <Link
              href='/dashboard'
              style={{
                display: 'inline-block',
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'transparent',
                color: 'var(--me-ink)',
                border: '1px solid var(--me-line)',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
