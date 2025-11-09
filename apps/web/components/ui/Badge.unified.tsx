'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';

/**
 * Unified Badge Component
 * Consolidates Badge, StatusBadge, and StatusChip into one flexible component
 * 
 * @example
 * // Simple badge
 * <Badge>New</Badge>
 * 
 * // Status badge
 * <Badge variant="success">Completed</Badge>
 * 
 * // With icon
 * <Badge variant="warning" icon="alert">Pending</Badge>
 * 
 * // With dot
 * <Badge variant="info" withDot>In Progress</Badge>
 */

export type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info'
  | 'neutral';

export type BadgeStatus =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'posted'
  | 'open'
  | 'assigned'
  | 'delayed'
  | 'at_risk'
  | 'on_going'
  | 'approved'
  | 'in_review'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'failed';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  status?: BadgeStatus; // Auto-maps to variant with predefined colors
  size?: BadgeSize;
  icon?: string;
  withDot?: boolean;
  uppercase?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Get variant configuration for colors
 */
const getVariantConfig = (variant: BadgeVariant) => {
  const configs: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    default: {
      bg: theme.colors.backgroundSecondary,
      text: theme.colors.textSecondary,
      border: theme.colors.border,
    },
    neutral: {
      bg: '#F3F4F6',
      text: '#6B7280',
      border: '#D1D5DB',
    },
    primary: {
      bg: `${theme.colors.primary}15`,
      text: theme.colors.primary,
      border: `${theme.colors.primary}40`,
    },
    success: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0',
    },
    warning: {
      bg: '#FEF3C7',
      text: '#EA580C',
      border: '#FDE68A',
    },
    error: {
      bg: '#FEE2E2',
      text: '#DC2626',
      border: '#FCA5A5',
    },
    info: {
      bg: '#EFF6FF',
      text: '#2563EB',
      border: '#BFDBFE',
    },
  };

  return configs[variant];
};

/**
 * Map status to variant
 */
const statusToVariant = (status: BadgeStatus): BadgeVariant => {
  const mapping: Record<BadgeStatus, BadgeVariant> = {
    completed: 'success',
    approved: 'success',
    accepted: 'success',
    active: 'success',
    in_progress: 'warning',
    on_going: 'warning',
    assigned: 'warning',
    pending: 'neutral',
    posted: 'info',
    open: 'info',
    sent: 'info',
    delayed: 'error',
    at_risk: 'error',
    declined: 'error',
    cancelled: 'error',
    inactive: 'error',
    failed: 'error',
    in_review: 'warning',
    draft: 'neutral',
  };

  return mapping[status] || 'default';
};

/**
 * Get size configuration
 */
const getSizeConfig = (size: BadgeSize) => {
  const configs = {
    xs: {
      padding: '2px 6px',
      fontSize: '10px',
      borderRadius: '6px',
      iconSize: 10,
    },
    sm: {
      padding: '4px 8px',
      fontSize: theme.typography.fontSize.xs,
      borderRadius: '8px',
      iconSize: 12,
    },
    md: {
      padding: '6px 12px',
      fontSize: theme.typography.fontSize.sm,
      borderRadius: '12px',
      iconSize: 14,
    },
    lg: {
      padding: '8px 16px',
      fontSize: theme.typography.fontSize.md,
      borderRadius: '14px',
      iconSize: 16,
    },
  };

  return configs[size];
};

export function Badge({
  children,
  variant = 'default',
  status,
  size = 'md',
  icon,
  withDot = false,
  uppercase = false,
  className = '',
  style = {},
}: BadgeProps) {
  // If status is provided, use it to determine variant
  const effectiveVariant = status ? statusToVariant(status) : variant;
  const config = getVariantConfig(effectiveVariant);
  const sizeConfig = getSizeConfig(size);

  // Determine icon to show
  const resolvedIcon = icon || (withDot ? 'dot' : undefined);

  return (
    <span
      className={`badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing[1],
        padding: sizeConfig.padding,
        borderRadius: sizeConfig.borderRadius,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        fontSize: sizeConfig.fontSize,
        fontWeight: theme.typography.fontWeight.medium,
        textTransform: uppercase ? 'uppercase' : 'none',
        whiteSpace: 'nowrap',
        letterSpacing: uppercase ? '0.02em' : '0',
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {resolvedIcon && (
        <Icon
          name={resolvedIcon}
          size={resolvedIcon === 'dot' ? 8 : sizeConfig.iconSize}
          color={config.text}
        />
      )}
      <span>{children}</span>
    </span>
  );
}

/**
 * Badge Subcomponents for common use cases
 */

export function StatusBadge({ status, size = 'md' }: { status: BadgeStatus; size?: BadgeSize }) {
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <Badge status={status} size={size}>
      {label}
    </Badge>
  );
}

export function CountBadge({ count, variant = 'primary', size = 'sm' }: { count: number; variant?: BadgeVariant; size?: BadgeSize }) {
  if (count === 0) return null;
  return (
    <Badge variant={variant} size={size}>
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

export default Badge;

