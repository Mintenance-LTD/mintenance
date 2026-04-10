'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';
import { CardBase } from './Card.unified.base';

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
    <CardBase padding='lg'>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing[4],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          {current} of {total} completed
        </span>
      </div>
    </CardBase>
  );
}
