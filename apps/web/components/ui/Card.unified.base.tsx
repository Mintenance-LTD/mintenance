'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import {
  getGradientCardStyle,
  getCardHoverStyle,
} from '@/lib/theme-enhancements';

export type CardVariant =
  | 'default'
  | 'elevated'
  | 'outlined'
  | 'highlighted'
  | 'bordered'
  | 'gradient-primary'
  | 'gradient-success'
  | 'gradient-warning';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  onClick?: () => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  // Accessibility
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  tabIndex?: number;
}

// ============================================================================
// MAIN CARD COMPONENT
// ============================================================================

export function CardBase({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = '',
  style = {},
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  tabIndex,
}: CardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isInteractive = !!onClick;

  // Variant styles
  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.shadows.sm,
    },
    elevated: {
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.shadows.lg,
    },
    outlined: {
      backgroundColor: 'transparent',
      border: `2px solid ${theme.colors.border}`,
      boxShadow: 'none',
    },
    highlighted: {
      backgroundColor: theme.colors.primary,
      border: `1px solid ${theme.colors.primary}`,
      color: theme.colors.white,
      boxShadow: theme.shadows.sm,
    },
    bordered: {
      backgroundColor: 'transparent',
      border: `2px solid ${theme.colors.border}`,
      boxShadow: 'none',
    },
    'gradient-primary': {
      ...getGradientCardStyle('primary'),
    },
    'gradient-success': {
      ...getGradientCardStyle('success'),
    },
    'gradient-warning': {
      ...getGradientCardStyle('warning'),
    },
  };

  // Padding values - Standardize to 24px (p-6) per plan
  const paddingValues: Record<CardPadding, string> = {
    none: '0',
    sm: `${theme.spacing[4]}px`, // 16px
    md: `${theme.spacing[6]}px`, // 24px - standard card padding per plan
    lg: `${theme.spacing[8]}px`, // 32px
  };

  // Base styles - Consistent with design: rounded-xl (12px), padding 24px, shadow-sm
  const baseStyles: React.CSSProperties = {
    ...variantStyles[variant],
    padding: paddingValues[padding],
    borderRadius: '12px', // rounded-xl to match design images
    cursor: isInteractive ? 'pointer' : 'default',
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    position: 'relative',
  };

  // Hover styles - Enhanced with better lift effect
  const hoverStyles: React.CSSProperties =
    isInteractive && (hover || isHovered)
      ? {
          ...getCardHoverStyle(),
        }
      : {};

  // Focus styles
  const focusStyles: React.CSSProperties =
    isFocused && isInteractive
      ? {
          outline: `3px solid ${theme.colors.primary}`,
          outlineOffset: '2px',
        }
      : {};

  // Combined styles
  const cardStyles: React.CSSProperties = {
    ...baseStyles,
    ...hoverStyles,
    ...focusStyles,
    ...style,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={`card ${className}`}
      style={cardStyles}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
      role={role || (isInteractive ? 'button' : undefined)}
      tabIndex={
        tabIndex !== undefined ? tabIndex : isInteractive ? 0 : undefined
      }
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
    >
      {children}
    </div>
  );
}
