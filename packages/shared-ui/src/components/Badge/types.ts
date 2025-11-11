/**
 * Shared Badge Component Props
 * 
 * Common interface for Badge component across web and mobile platforms
 */

import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BaseBadgeProps {
  // Content
  children: React.ReactNode;

  // Variants & styling
  variant?: BadgeVariant;
  size?: BadgeSize;

  // Icon
  icon?: React.ReactNode;
  showIcon?: boolean;

  // Accessibility
  'aria-label'?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'status' | 'text';

  // Testing
  testID?: string;
}

// Web-specific props
export interface WebBadgeProps extends Omit<BaseBadgeProps, 'children'>, Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'aria-label'> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Native-specific props
export interface NativeBadgeProps extends BaseBadgeProps {
  style?: unknown; // ViewStyle
  textStyle?: unknown; // TextStyle
}

