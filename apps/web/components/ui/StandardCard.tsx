'use client';

import React from 'react';
import { theme } from '@/lib/theme';

/**
 * StandardCard Component
 * Consistent card design matching Dashboard/Profile pattern
 */

interface StandardCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StandardCard({
  title,
  description,
  children,
  actions,
  noPadding = false,
  className = '',
  style = {},
}: StandardCardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '20px',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Header */}
      {(title || description || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: theme.spacing[6],
            borderBottom: children ? `1px solid ${theme.colors.border}` : 'none',
          }}
        >
          <div style={{ flex: 1 }}>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                  marginBottom: description ? theme.spacing[1] : 0,
                }}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                }}
              >
                {description}
              </p>
            )}
          </div>
          {actions && <div style={{ marginLeft: theme.spacing[4] }}>{actions}</div>}
        </div>
      )}

      {/* Content */}
      {children && (
        <div
          style={{
            padding: noPadding ? 0 : theme.spacing[6],
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

