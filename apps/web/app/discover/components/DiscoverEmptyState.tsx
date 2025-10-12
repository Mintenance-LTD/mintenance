'use client';

import React from 'react';
import { Button } from '@/components/ui';
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
    <div style={{ textAlign: 'center', padding: '80px 40px' }}>
      <h2 style={{
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: '16px'
      }}>
        🎉 All Done!
      </h2>
      <p style={{
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeight.relaxed,
        marginBottom: '24px'
      }}>
        {isContractor
          ? "You've seen all available jobs."
          : "You've seen all available contractors in your area."}
      </p>
      <Button
        onClick={onRestart}
        variant="primary"
      >
        Start Over
      </Button>
    </div>
  );
}

