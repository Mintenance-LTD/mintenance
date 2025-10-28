'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
  onClick?: () => void;
  // Accessibility props
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  tabIndex?: number;
}

/**
 * Enhanced Card Component with Full Accessibility Support
 *
 * Features:
 * - 3 variants (default, elevated, outlined)
 * - 4 padding sizes (none, sm, md, lg)
 * - Interactive states with keyboard navigation
 * - Proper ARIA attributes for interactive cards
 * - Focus visible states
 * - Hover effects
 *
 * @example
 * <Card variant="elevated" padding="lg">Content</Card>
 * <Card onClick={handleClick} aria-label="Select card">Interactive Card</Card>
 */
export function Card({
  children,
  className = '',
  style = {},
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  tabIndex,
}: CardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isInteractive = !!onClick;

  // Determine effective role
  const effectiveRole = role || (isInteractive ? 'button' : undefined);

  // Determine effective tabIndex
  const effectiveTabIndex = tabIndex !== undefined ? tabIndex : (isInteractive ? 0 : undefined);

  // Variant-specific styles
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadows.sm,
    },
    elevated: {
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadows.lg,
    },
    outlined: {
      backgroundColor: 'transparent',
      border: `2px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.xl,
      boxShadow: 'none',
    },
  };

  // Padding values
  const paddingValues = {
    none: '0',
    sm: theme.spacing[3],
    md: theme.spacing[4],
    lg: theme.spacing[6],
  };

  // Base styles
  const baseStyles: React.CSSProperties = {
    ...variantStyles[variant],
    padding: paddingValues[padding],
    cursor: isInteractive ? 'pointer' : 'default',
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    position: 'relative',
  };

  // Hover styles
  const hoverStyles: React.CSSProperties = (isInteractive && (hover || isHovered))
    ? {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows.xl,
        borderColor: theme.colors.borderDark,
      }
    : {};

  // Focus styles for accessibility
  const focusStyles: React.CSSProperties = isFocused && isInteractive
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={effectiveRole}
      tabIndex={effectiveTabIndex}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Card Header Component
 * Used for card titles and actions
 */
export function CardHeader({ children, className = '', style = {} }: CardHeaderProps) {
  return (
    <div
      className={`card-header ${className}`}
      style={{
        marginBottom: theme.spacing[4],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * Card Title Component
 * Semantic heading for card content
 */
export function CardTitle({ children, className = '', style = {}, as = 'h3' }: CardTitleProps) {
  const Tag = as;

  return (
    <Tag
      className={`card-title ${className}`}
      style={{
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.textPrimary,
        margin: 0,
        lineHeight: theme.typography.lineHeight.tight,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Card Description Component
 * Subtitle or description text
 */
export function CardDescription({ children, className = '', style = {} }: CardDescriptionProps) {
  return (
    <p
      className={`card-description ${className}`}
      style={{
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        margin: 0,
        marginTop: theme.spacing[1],
        lineHeight: theme.typography.lineHeight.normal,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Card Content Component
 * Main content area of the card
 */
export function CardContent({ children, className = '', style = {} }: CardContentProps) {
  return (
    <div
      className={`card-content ${className}`}
      style={{
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Card Footer Component
 * Footer area for actions or additional info
 */
export function CardFooter({ children, className = '', style = {} }: CardFooterProps) {
  return (
    <div
      className={`card-footer ${className}`}
      style={{
        marginTop: theme.spacing[4],
        paddingTop: theme.spacing[4],
        borderTop: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
