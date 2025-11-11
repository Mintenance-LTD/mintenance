'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { getIconContainerStyle } from '@/lib/theme-enhancements';
import styles from '../../app/admin/admin.module.css';

interface Trend {
  direction: 'up' | 'down';
  value: string;
  label?: string;
}

interface AdminMetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: string;
  iconColor?: string;
  trend?: Trend;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function AdminMetricCard({
  label,
  value,
  icon,
  iconColor = theme.colors.primary,
  trend,
  subtitle,
  onClick,
  className,
}: AdminMetricCardProps) {
  const cardContent = (
    <Card
      className={`${styles.metricCard} ${className || ''}`}
      style={{
        padding: theme.spacing[6],
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: theme.spacing[4],
        }}
      >
        {/* Icon Container */}
        <div style={getIconContainerStyle(iconColor, 48)}>
          <Icon name={icon} size={24} color={iconColor} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: theme.spacing[2],
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              lineHeight: 1.2,
              marginBottom: subtitle ? theme.spacing[1] : 0,
            }}
          >
            {value}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                marginTop: theme.spacing[1],
              }}
            >
              {subtitle}
            </div>
          )}
          {trend && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
                marginTop: theme.spacing[2],
              }}
            >
              <Icon
                name={trend.direction === 'up' ? 'trendingUp' : 'trendingDown'}
                size={14}
                color={trend.direction === 'up' ? theme.colors.success : theme.colors.error}
              />
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: trend.direction === 'up' ? theme.colors.success : theme.colors.error,
                }}
              >
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
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return cardContent;
}

