'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface MetricCardProps {
  label: string;
  value: string | number;
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
  color = theme.colors.primary
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up': return 'chevronUp';
      case 'down': return 'chevronDown';
      default: return 'minus';
    }
  };

  const getTrendColor = () => {
    if (!trend) return theme.colors.textSecondary;
    switch (trend.direction) {
      case 'up': return theme.colors.success;
      case 'down': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '18px',
      padding: theme.spacing[5],
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[2],
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          fontWeight: theme.typography.fontWeight.medium,
        }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: `${color}15`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name={icon} size={16} color={color} />
          </div>
        )}
      </div>

      {/* Value */}
      <span style={{
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
      }}>
        {value}
      </span>

      {/* Subtitle or Trend */}
      {(subtitle || trend) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          {trend && (
            <>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing[1],
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color: getTrendColor(),
              }}>
                <Icon name={getTrendIcon()!} size={12} color={getTrendColor()} />
                {trend.value}
              </span>
              {trend.label && (
                <span style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                }}>
                  {trend.label}
                </span>
              )}
            </>
          )}
          {subtitle && !trend && (
            <span style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
            }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
