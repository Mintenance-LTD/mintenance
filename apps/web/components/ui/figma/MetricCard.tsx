import React, { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    label: string;
  };
  gradient?: boolean;
  gradientVariant?: 'primary' | 'success' | 'warning' | 'error';
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  gradient = false,
  gradientVariant = 'primary',
}: MetricCardProps) {
  const gradientStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#FFFFFF', // Solid opaque white background
      border: `1px solid ${theme.colors.border}`,
      borderTop: `3px solid ${theme.colors.primary}`,
      boxShadow: theme.shadows.sm,
    },
    success: {
      backgroundColor: '#FFFFFF', // Solid opaque white background
      border: `1px solid ${theme.colors.border}`,
      borderTop: `3px solid ${theme.colors.success}`,
      boxShadow: theme.shadows.sm,
    },
    warning: {
      backgroundColor: '#FFFFFF', // Solid opaque white background
      border: `1px solid ${theme.colors.border}`,
      borderTop: `3px solid ${theme.colors.warning}`,
      boxShadow: theme.shadows.sm,
    },
    error: {
      backgroundColor: '#FFFFFF', // Solid opaque white background
      border: `1px solid ${theme.colors.border}`,
      borderTop: `3px solid ${theme.colors.error}`,
      boxShadow: theme.shadows.sm,
    },
  };

  const iconBgColor = iconColor || theme.colors.primary;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '268px',
        minHeight: '196px',
        padding: '18px',
        paddingBottom: '20px', // Extra bottom padding to prevent text cutoff
        borderRadius: theme.borderRadius.lg,
        backgroundColor: gradient ? '#FFFFFF' : theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden', // Keep hidden for clean borders, but ensure proper padding
        ...(gradient ? gradientStyles[gradientVariant] : {}),
      }}
    >
      {/* Icon Container */}
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: theme.borderRadius.md,
          backgroundColor: `${iconBgColor}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0, // Prevent icon from shrinking
        }}
      >
        <Icon name={icon} size={22} color={iconBgColor} />
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            style={{
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.regular,
              color: theme.colors.textSecondary,
            }}
          >
            {label}
          </span>
          <div
            style={{
              fontSize: theme.typography.fontSize['4xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              lineHeight: '1.2', // Better line height for large text
            }}
          >
            {value}
          </div>
          {subtitle && (
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                lineHeight: '1.4', // Ensure proper line height for subtitle
              }}
            >
              {subtitle}
            </span>
          )}
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              lineHeight: '1.5', // Ensure proper line height for trend text
              marginTop: 'auto', // Push trend to bottom if there's extra space
            }}
          >
            <Icon
              name={trend.direction === 'up' ? 'arrowUp' : trend.direction === 'down' ? 'arrowDown' : 'minus'}
              size={14}
              color={trend.direction === 'up' ? theme.colors.success : trend.direction === 'down' ? theme.colors.error : theme.colors.textSecondary}
            />
            <span>
              {trend.value} {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

