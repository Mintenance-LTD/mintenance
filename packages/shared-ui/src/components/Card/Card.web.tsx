/**
 * Card Component - Web Implementation
 * 
 * Web-specific Card component using design tokens
 */

'use client';

import React, { useState } from 'react';
import { webTokens } from '@mintenance/design-tokens';
import { cn } from '../../utils/cn';
import type { WebCardProps, CardVariant, CardPadding } from './types';

/**
 * Card Component for Web
 * 
 * Uses design tokens for consistent styling across platforms
 */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  disabled = false,
  onClick,
  hover = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  style,
  ...props
}: WebCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isInteractive = !!onClick;

  // Base styles using design tokens
  const baseStyles: React.CSSProperties = {
    position: 'relative',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
    cursor: isInteractive ? 'pointer' : 'default',
    opacity: disabled ? 0.6 : 1,
  };

  // Variant styles
  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      backgroundColor: webTokens.colors.white,
      border: `1px solid ${webTokens.colors.border}`,
      borderRadius: webTokens.borderRadius.xl,
      boxShadow: webTokens.shadows.sm,
    },
    elevated: {
      backgroundColor: webTokens.colors.white,
      border: `1px solid ${webTokens.colors.border}`,
      borderRadius: webTokens.borderRadius.xl,
      boxShadow: webTokens.shadows.lg,
    },
    outlined: {
      backgroundColor: 'transparent',
      border: `2px solid ${webTokens.colors.border}`,
      borderRadius: webTokens.borderRadius.xl,
      boxShadow: 'none',
    },
  };

  // Padding values
  const paddingValues: Record<CardPadding, string> = {
    none: '0',
    sm: `${webTokens.spacing.md}px`,
    md: `${webTokens.spacing.lg}px`,
    lg: `${webTokens.spacing.xl}px`,
  };

  // Hover styles
  const hoverStyles: React.CSSProperties = (isInteractive && (hover || isHovered) && !disabled)
    ? {
        transform: 'translateY(-2px)',
        boxShadow: webTokens.shadows.xl,
        borderColor: webTokens.colors.borderDark,
      }
    : {};

  // Focus styles for accessibility
  const focusStyles: React.CSSProperties = isFocused && isInteractive && !disabled
    ? {
        outline: `3px solid ${webTokens.colors.primary}`,
        outlineOffset: '4px',
      }
    : {};

  const cardStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    padding: paddingValues[padding],
    ...hoverStyles,
    ...focusStyles,
    ...style,
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.(e as any);
    }
    props.onKeyDown?.(e);
  };

  return (
    <div
      {...props}
      className={cn('card', className)}
      style={cardStyles}
      onClick={isInteractive && !disabled ? onClick : undefined}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
}

// Card sub-components
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('card-header', className)}
      style={{
        marginBottom: webTokens.spacing.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
}

export function CardTitle({ children, as = 'h3', className = '', ...props }: CardTitleProps) {
  const Tag = as;
  return (
    <Tag
      className={cn('card-title', className)}
      style={{
        fontSize: webTokens.typography.fontSize.xl,
        fontWeight: webTokens.typography.fontWeight.semibold,
        color: webTokens.colors.textPrimary,
        margin: 0,
        lineHeight: webTokens.typography.lineHeight.tight,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '', ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn('card-description', className)}
      style={{
        fontSize: webTokens.typography.fontSize.sm,
        color: webTokens.colors.textSecondary,
        margin: 0,
        marginTop: webTokens.spacing.sm,
        lineHeight: webTokens.typography.lineHeight.normal,
      }}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={cn('card-content', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div
      className={cn('card-footer', className)}
      style={{
        marginTop: webTokens.spacing.lg,
        paddingTop: webTokens.spacing.lg,
        borderTop: `1px solid ${webTokens.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: webTokens.spacing.md,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

