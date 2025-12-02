'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { getIconContainerStyle } from '@/lib/theme-enhancements';

export interface IconContainerProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

/**
 * IconContainer - Standardized icon wrapper with background, sizing, and colors
 * 
 * Follows design system:
 * - Standard sizes: 20px (nav), 24px (actions), 32px, 48px
 * - Background: Subtle gradient with color tint
 * - Border radius: 8px (lg) by default
 * - Consistent spacing and colors from theme
 */
export function IconContainer({
  children,
  size = 24,
  color,
  variant = 'default',
  className,
  rounded = 'lg',
}: IconContainerProps) {
  const variantColors = {
    default: theme.colors.primary,
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
  };

  const iconColor = color || variantColors[variant];
  const containerStyle = getIconContainerStyle(iconColor, size);

  const roundedClasses = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg', // 8px - standard per plan
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(roundedClasses[rounded], className)}
      style={{
        ...containerStyle,
        borderRadius: rounded === 'lg' ? theme.borderRadius.lg : undefined,
      }}
    >
      {children}
    </div>
  );
}

