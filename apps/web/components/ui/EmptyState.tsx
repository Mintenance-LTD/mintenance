'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from './Button';
import { Icon } from './Icon';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'minimal';
}

/**
 * Empty State Component
 * Displays a friendly message when there's no data to show
 */
export function EmptyState({ icon, title, description, action, variant = 'default' }: EmptyStateProps) {
  if (variant === 'minimal') {
    return (
      <div style={{
        padding: theme.spacing[6],
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: theme.typography.fontSize['4xl'],
          marginBottom: theme.spacing[4],
        }}>
          {icon || <Icon name="inbox" size={48} color={theme.colors.textTertiary} />}
        </div>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
          margin: 0,
        }}>
          {title}
        </h3>
        <p style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.base,
          marginBottom: action ? theme.spacing[6] : 0,
          margin: 0,
        }}>
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} variant="primary">
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: theme.spacing[8],
      textAlign: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      border: `1px solid ${theme.colors.border}`,
    }}>
      <div style={{
        fontSize: theme.typography.fontSize['4xl'],
        marginBottom: theme.spacing[6],
      }}>
        {icon || <Icon name="inbox" size={64} color={theme.colors.textTertiary} />}
      </div>
      <h3 style={{
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing[2],
        margin: 0,
      }}>
        {title}
      </h3>
      <p style={{
        color: theme.colors.textSecondary,
        fontSize: theme.typography.fontSize.base,
        maxWidth: '500px',
        margin: '0 auto',
        marginBottom: action ? theme.spacing[6] : 0,
      }}>
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}

