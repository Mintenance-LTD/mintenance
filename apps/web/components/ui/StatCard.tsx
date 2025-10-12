'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';

/**
 * StatCard Component
 * Standardized metric card matching Dashboard design
 */

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: string;
  iconColor?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function StatCard({
  label,
  value,
  helper,
  icon,
  iconColor,
  variant = 'default',
}: StatCardProps) {
  const variantColors = {
    default: theme.colors.textPrimary,
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  };

  const valueColor = variantColors[variant];

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '18px',
        padding: theme.spacing[5],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.lg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Icon (optional) */}
      {icon && (
        <div style={{ marginBottom: theme.spacing[1] }}>
          <Icon name={icon} size={24} color={iconColor || valueColor} />
        </div>
      )}

      {/* Label */}
      <span
        style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          fontWeight: theme.typography.fontWeight.medium,
        }}
      >
        {label}
      </span>

      {/* Value */}
      <span
        style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: valueColor,
          lineHeight: theme.typography.lineHeight.tight,
        }}
      >
        {value}
      </span>

      {/* Helper Text */}
      {helper && (
        <span
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
            lineHeight: theme.typography.lineHeight.normal,
          }}
        >
          {helper}
        </span>
      )}
    </div>
  );
}

