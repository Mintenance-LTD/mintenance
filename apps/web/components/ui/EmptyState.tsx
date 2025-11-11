'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from './Button';
import { getFadeInStyle } from '@/lib/theme-enhancements';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'minimal' | 'illustrated';
}

/**
 * EmptyState Component
 * 
 * Displays an empty state with icon, title, description, and optional action.
 * Enhanced with better visual design and animations.
 * 
 * @example
 * <EmptyState
 *   icon="briefcase"
 *   title="No jobs found"
 *   description="Check back later or adjust your filters"
 *   actionLabel="Browse Jobs"
 *   onAction={() => router.push('/jobs')}
 * />
 */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  style = {},
  variant = 'default',
}: EmptyStateProps) {
  const isMinimal = variant === 'minimal';
  const isIllustrated = variant === 'illustrated';

  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMinimal ? theme.spacing[8] : theme.spacing[12],
        textAlign: 'center',
        borderRadius: theme.borderRadius.xl,
        border: `1px dashed ${theme.colors.border}`,
        backgroundColor: theme.colors.backgroundSecondary,
        ...getFadeInStyle(100),
        ...style,
      }}
    >
      {/* Icon */}
      {!isMinimal && (
        <div
          style={{
            width: isIllustrated ? '120px' : '80px',
            height: isIllustrated ? '120px' : '80px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.colors.primary}15 0%, ${theme.colors.primary}08 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing[6],
            border: `2px solid ${theme.colors.primary}20`,
          }}
        >
          <Icon
            name={icon}
            size={isIllustrated ? 48 : 32}
            color={theme.colors.primary}
          />
        </div>
      )}

      {/* Title */}
      <h3
        style={{
          margin: 0,
          marginBottom: description ? theme.spacing[2] : theme.spacing[4],
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            margin: 0,
            marginBottom: actionLabel ? theme.spacing[6] : 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            maxWidth: '400px',
            lineHeight: theme.typography.lineHeight.relaxed,
          }}
        >
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="md"
          onClick={onAction}
          style={{
            marginTop: theme.spacing[2],
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
