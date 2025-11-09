'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';

interface DiscoverEmptyStateProps {
  userRole?: 'contractor' | 'homeowner' | 'admin';
  onRestart: () => void;
}

/**
 * Empty state component shown when all items have been reviewed
 */
export function DiscoverEmptyState({ userRole, onRestart }: DiscoverEmptyStateProps) {
  const isContractor = userRole === 'contractor';
  
  return (
    <div style={{ textAlign: 'center', padding: '80px 40px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        fontSize: '64px',
        marginBottom: theme.spacing[4]
      }}>
        🎉
      </div>
      <h2 style={{
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing[2]
      }}>
        All Done!
      </h2>
      <p style={{
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeight.relaxed,
        marginBottom: theme.spacing[6]
      }}>
        {isContractor
          ? "You've reviewed all available jobs. Check back later for new opportunities or browse all jobs."
          : "You've seen all available contractors in your area. Check back later for new professionals."}
      </p>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[3],
        alignItems: 'center'
      }}>
        {isContractor ? (
          <>
            <Link
              href="/contractor/jobs-near-you"
              style={{
                display: 'inline-block',
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: theme.colors.primary,
                color: 'white',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: theme.shadows.sm
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.sm;
              }}
            >
              Browse All Jobs
            </Link>
            <button
              onClick={onRestart}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'transparent',
                color: theme.colors.textPrimary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
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
                backgroundColor: theme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: theme.shadows.sm
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.sm;
              }}
            >
              Start Over
            </button>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-block',
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'transparent',
                color: theme.colors.textPrimary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
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

