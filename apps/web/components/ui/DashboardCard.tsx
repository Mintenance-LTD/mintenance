'use client';

import React, { ReactNode } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';

/**
 * Dashboard Card Component
 * Professional card for metrics, charts, and dashboard sections
 */

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  icon?: string;
  actions?: ReactNode;
  variant?: 'default' | 'highlighted' | 'bordered';
  className?: string;
}

export function DashboardCard({
  title,
  subtitle,
  children,
  icon,
  actions,
  variant = 'default',
  className,
}: DashboardCardProps) {
  const variantStyles = {
    default: {
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
    },
    highlighted: {
      backgroundColor: theme.colors.primary,
      border: `1px solid ${theme.colors.primary}`,
      color: theme.colors.white,
    },
    bordered: {
      backgroundColor: 'transparent',
      border: `2px solid ${theme.colors.border}`,
    },
  };

  return (
    <div
      className={className}
      style={{
        ...variantStyles[variant],
        borderRadius: '20px',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[5],
        boxShadow: theme.shadows.sm,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = theme.shadows.sm;
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: theme.spacing[4],
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
              <Icon
                name={icon}
                size={24}
                color={variant === 'highlighted' ? theme.colors.white : theme.colors.primary}
              />
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
    </div>
  );
}

/**
 * Metric Card - For displaying key metrics
 */
interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ label, value, change, icon, trend = 'neutral' }: MetricCardProps) {
  const trendColors = {
    up: theme.colors.success,
    down: theme.colors.error,
    neutral: theme.colors.textSecondary,
  };

  const trendIcons = {
    up: 'chevronUp',
    down: 'chevronDown',
    neutral: 'minus',
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '18px',
        padding: theme.spacing[5],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[3],
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Icon & Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            fontWeight: theme.typography.fontWeight.medium,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: theme.colors.backgroundSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={18} color={theme.colors.primary} />
          </div>
        )}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: theme.typography.fontSize['4xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {/* Change */}
      {change && (
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: `${trendColors[trend]}20`,
            }}
          >
            <Icon name={trendIcons[trend]} size={14} color={trendColors[trend]} />
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: trendColors[trend],
              }}
            >
              {change.value > 0 ? '+' : ''}
              {change.value}%
            </span>
          </div>
          <span
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textTertiary,
            }}
          >
            {change.label}
          </span>
        </div>
      )}
    </div>
  );
}

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

export function ProgressCard({
  label,
  current,
  total,
  icon,
  color = theme.colors.primary,
}: ProgressCardProps) {
  const percentage = Math.min(100, Math.round((current / total) * 100));

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '18px',
        padding: theme.spacing[5],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <span
          style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.bold,
            color: color,
          }}
        >
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
        <span
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          {current} of {total} completed
        </span>
      </div>
    </div>
  );
}

