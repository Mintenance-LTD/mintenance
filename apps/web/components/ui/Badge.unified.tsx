/**
 * Badge Component - Compatibility Wrapper
 * 
 * Wraps the shared Badge component to maintain backward compatibility
 * with existing web app code while migrating to shared components.
 * 
 * This wrapper will be removed once all files are migrated.
 */

import React from 'react';
import { Badge as SharedBadge } from '@mintenance/shared-ui';
import type { WebBadgeProps } from '@mintenance/shared-ui';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';

// Extend shared Badge props for backward compatibility
export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
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

export interface BadgeProps extends Omit<WebBadgeProps, 'variant' | 'size'> {
  variant?: BadgeVariant;
  status?: BadgeStatus; // Auto-maps to variant with predefined colors
  size?: BadgeSize;
  icon?: string;
  withDot?: boolean;
  uppercase?: boolean;
}

/**
 * Map status to variant
 */
const statusToVariant = (status: BadgeStatus): WebBadgeProps['variant'] => {
  const mapping: Record<BadgeStatus, WebBadgeProps['variant']> = {
    completed: 'success',
    approved: 'success',
    accepted: 'success',
    active: 'success',
    in_progress: 'warning',
    on_going: 'warning',
    assigned: 'warning',
    pending: 'default',
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
    draft: 'default',
  };
  return mapping[status] || 'default';
};

/**
 * Map old variant to new variant
 */
const mapVariant = (oldVariant?: BadgeVariant): WebBadgeProps['variant'] => {
  if (!oldVariant) return 'default';
  switch (oldVariant) {
    case 'neutral':
      return 'default';
    case 'primary':
      return 'info'; // Map primary to info
    default:
      return oldVariant;
  }
};

/**
 * Map old size to new size
 */
const mapSize = (oldSize?: BadgeSize): WebBadgeProps['size'] => {
  if (!oldSize) return 'md';
  switch (oldSize) {
    case 'xs':
      return 'sm'; // Map xs to sm
    default:
      return oldSize;
  }
};

/**
 * Compatibility wrapper for Badge component
 */
export function Badge({
  variant = 'default',
  status,
  size = 'md',
  icon,
  withDot = false,
  uppercase = false,
  children,
  className = '',
  style,
  ...props
}: BadgeProps) {
  // Determine effective variant
  const effectiveVariant = status ? statusToVariant(status) : mapVariant(variant);
  const mappedSize = mapSize(size);

  // Render icon if provided
  const iconElement = (icon || withDot) ? (
    <Icon
      name={withDot ? 'dot' : icon!}
      size={withDot ? 8 : (size === 'xs' ? 10 : size === 'sm' ? 12 : size === 'md' ? 14 : 16)}
      color="currentColor"
    />
  ) : undefined;

  return (
    <SharedBadge
      {...(props as any)}
      variant={effectiveVariant as any}
      size={mappedSize}
      icon={iconElement}
      showIcon={!!iconElement}
      className={cn(uppercase && 'uppercase', className)}
      style={{
        textTransform: uppercase ? 'uppercase' : undefined,
        letterSpacing: uppercase ? '0.02em' : undefined,
        ...style,
      }}
    >
      {children}
    </SharedBadge>
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
