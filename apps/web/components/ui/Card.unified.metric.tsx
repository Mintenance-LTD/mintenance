'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';
import {
  getGradientCardStyle,
  getIconContainerStyle,
} from '@/lib/theme-enhancements';
import { CardBase } from './Card.unified.base';

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
}: MetricCardProps & {
  gradient?: boolean;
  gradientVariant?: 'primary' | 'success' | 'warning';
}) {
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

  const cardStyle = gradient ? getGradientCardStyle(gradientVariant) : {};

  return (
    <CardBase
      padding='lg'
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
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
                <Icon
                  name={getTrendIcon()!}
                  size={12}
                  color={getTrendColor()}
                />
                {trend.value}
              </span>
              {trend.label && (
                <span
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {trend.label}
                </span>
              )}
            </>
          )}
          {subtitle && !trend && (
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </CardBase>
  );
}
