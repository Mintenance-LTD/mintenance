'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';
import { getGradientCardStyle, getCardHoverStyle, getIconContainerStyle } from '@/lib/theme-enhancements';

/**
 * Unified Card Component
 * Consolidates Card, DashboardCard, StandardCard, StatCard, MetricCard, ProgressCard
 * 
 * @example
 * // Simple card
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 * </Card>
 * 
 * // Dashboard/Metric card
 * <Card.Metric
 *   label="Total Revenue"
 *   value="£15,000"
 *   icon="currencyDollar"
 *   trend={{ direction: 'up', value: '+12%', label: 'from last month' }}
 * />
 * 
 * // Progress card
 * <Card.Progress
 *   label="Project Completion"
 *   current={75}
 *   total={100}
 *   icon="briefcase"
 * />
 */

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'highlighted' | 'bordered' | 'gradient-primary' | 'gradient-success' | 'gradient-warning';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  onClick?: () => void;
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

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
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
    sm: theme.spacing[4], // 16px
    md: theme.spacing[6], // 24px - standard card padding per plan
    lg: theme.spacing[8], // 32px
  };

  // Base styles - Consistent with plan: rounded-2xl (16px), padding 24px, shadow-sm
  const baseStyles: React.CSSProperties = {
    ...variantStyles[variant],
    padding: paddingValues[padding],
    borderRadius: '16px', // rounded-2xl per plan (was 20px)
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={role || (isInteractive ? 'button' : undefined)}
      tabIndex={tabIndex !== undefined ? tabIndex : isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
    >
      {children}
    </div>
  );
}

// ============================================================================
// CARD SUB-COMPONENTS
// ============================================================================

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

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
Card.Header = CardHeader;

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

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
Card.Title = CardTitle;

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

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
Card.Description = CardDescription;

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardContent({ children, className = '', style = {} }: CardContentProps) {
  return (
    <div className={`card-content ${className}`} style={{ ...style }}>
      {children}
    </div>
  );
}
Card.Content = CardContent;

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

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
Card.Footer = CardFooter;

// ============================================================================
// SPECIALIZED CARD VARIANTS
// ============================================================================

/**
 * Metric Card - For displaying KPIs and metrics
 */
interface MetricCardProps {
  label: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  icon?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    label?: string;
  };
  color?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  color = theme.colors.primary,
  gradient = false,
  gradientVariant = 'primary',
}: MetricCardProps & { gradient?: boolean; gradientVariant?: 'primary' | 'success' | 'warning' }) {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up':
        return 'chevronUp';
      case 'down':
        return 'chevronDown';
      default:
        return 'minus';
    }
  };

  const getTrendColor = () => {
    if (!trend) return theme.colors.textSecondary;
    switch (trend.direction) {
      case 'up':
        return theme.colors.success;
      case 'down':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const cardStyle = gradient
    ? getGradientCardStyle(gradientVariant)
    : {};

  return (
    <Card 
      padding="lg" 
      hover={true}
      style={{
        ...cardStyle,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[2],
        }}
      >
        <span
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: theme.spacing[1],
          }}
        >
          {label}
        </span>
        {icon && (
          <div style={getIconContainerStyle(color, 48)}>
            <Icon name={icon} size={24} color={color} />
          </div>
        )}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: theme.typography.fontSize['4xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          display: 'block',
          marginBottom: subtitle || trend ? theme.spacing[3] : 0,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      {/* Subtitle or Trend */}
      {(subtitle || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          {trend && (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: getTrendColor(),
                }}
              >
                <Icon name={getTrendIcon()!} size={12} color={getTrendColor()} />
                {trend.value}
              </span>
              {trend.label && (
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  {trend.label}
                </span>
              )}
            </>
          )}
          {subtitle && !trend && (
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
Card.Metric = MetricCard;

/**
 * Progress Card - For displaying progress towards goals
 */
interface ProgressCardProps {
  label: string;
  current: number;
  total: number;
  icon?: string;
  color?: string;
}

export function ProgressCard({ label, current, total, icon, color = theme.colors.primary }: ProgressCardProps) {
  const percentage = Math.min(100, Math.round((current / total) * 100));

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing[4] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          {icon && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                backgroundColor: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={icon} size={16} color={color} />
            </div>
          )}
          <span
            style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}
          >
            {label}
          </span>
        </div>
        <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold, color: color }}>
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.full,
          overflow: 'hidden',
          marginBottom: theme.spacing[2],
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.5s ease',
            borderRadius: theme.borderRadius.full,
          }}
        />
      </div>

      {/* Values */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
          {current} of {total} completed
        </span>
      </div>
    </Card>
  );
}
Card.Progress = ProgressCard;

/**
 * Dashboard Card - Full featured card with header, icon, subtitle, actions
 */
interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'highlighted';
}

export function DashboardCard({ title, subtitle, children, icon, actions, variant = 'default' }: DashboardCardProps) {
  return (
    <Card variant={variant === 'highlighted' ? 'highlighted' : 'default'} padding="lg">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[5],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], flex: 1 }}>
          {icon && (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                backgroundColor: variant === 'highlighted' ? 'rgba(255,255,255,0.2)' : theme.colors.backgroundSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name={icon} size={24} color={variant === 'highlighted' ? theme.colors.white : theme.colors.primary} />
            </div>
          )}
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: variant === 'highlighted' ? theme.colors.white : theme.colors.textPrimary,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  margin: 0,
                  marginTop: theme.spacing[1],
                  fontSize: theme.typography.fontSize.sm,
                  color: variant === 'highlighted' ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>

      {/* Content */}
      <div>{children}</div>
    </Card>
  );
}
Card.Dashboard = DashboardCard;

export default Card;

