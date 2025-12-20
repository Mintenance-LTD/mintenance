/**
 * Badge Component - Web Implementation
 * 
 * Web-specific Badge component using design tokens
 */

'use client';

import React from 'react';
import { webTokens } from '@mintenance/design-tokens';
import { cn } from '../../utils/cn';
import type { WebBadgeProps, BadgeVariant, BadgeSize } from './types';

/**
 * Badge Component for Web
 * 
 * Uses design tokens for consistent styling across platforms
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  showIcon = false,
  className = '',
  'aria-label': ariaLabel,
  style,
  ...props
}: WebBadgeProps) {
  // Size styles
  const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
    sm: {
      padding: `${webTokens.spacing.xs}px ${webTokens.spacing.sm}px`,
      fontSize: webTokens.typography.fontSize.xs,
      minHeight: '20px',
    },
    md: {
      padding: `${webTokens.spacing.sm}px ${webTokens.spacing.md}px`,
      fontSize: webTokens.typography.fontSize.sm,
      minHeight: '24px',
    },
    lg: {
      padding: `${webTokens.spacing.md}px ${webTokens.spacing.lg}px`,
      fontSize: webTokens.typography.fontSize.base,
      minHeight: '28px',
    },
  };

  // Variant styles
  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    success: {
      backgroundColor: webTokens.colors.success + '20',
      color: webTokens.colors.success,
      border: `1px solid ${webTokens.colors.success}40`,
    },
    warning: {
      backgroundColor: webTokens.colors.warning + '20',
      color: webTokens.colors.warning,
      border: `1px solid ${webTokens.colors.warning}40`,
    },
    error: {
      backgroundColor: webTokens.colors.error + '20',
      color: webTokens.colors.error,
      border: `1px solid ${webTokens.colors.error}40`,
    },
    info: {
      backgroundColor: webTokens.colors.primary + '20',
      color: webTokens.colors.primary,
      border: `1px solid ${webTokens.colors.primary}40`,
    },
    default: {
      backgroundColor: webTokens.colors.gray100,
      color: webTokens.colors.textPrimary,
      border: `1px solid ${webTokens.colors.border}`,
    },
  };

  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: webTokens.borderRadius.full,
    fontWeight: webTokens.typography.fontWeight.semibold,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span
      {...props}
      className={cn('badge', `badge-${variant}`, className)}
      style={badgeStyles}
      aria-label={ariaLabel}
      role="status"
    >
      {(showIcon || icon) && icon && (
        <span style={{ marginRight: webTokens.spacing.xs, display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

export default Badge;

