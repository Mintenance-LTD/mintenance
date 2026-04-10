'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';
import { CardBase } from './Card.unified.base';

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

export function DashboardCard({
  title,
  subtitle,
  children,
  icon,
  actions,
  variant = 'default',
}: DashboardCardProps) {
  return (
    <CardBase
      variant={variant === 'highlighted' ? 'highlighted' : 'default'}
      padding='lg'
    >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            flex: 1,
          }}
        >
          {icon && (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                backgroundColor:
                  variant === 'highlighted'
                    ? 'rgba(255,255,255,0.2)'
                    : theme.colors.backgroundSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon
                name={icon}
                size={24}
                color={
                  variant === 'highlighted'
                    ? theme.colors.white
                    : theme.colors.primary
                }
              />
            </div>
          )}
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color:
                  variant === 'highlighted'
                    ? theme.colors.white
                    : theme.colors.textPrimary,
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
                  color:
                    variant === 'highlighted'
                      ? 'rgba(255,255,255,0.8)'
                      : theme.colors.textSecondary,
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
    </CardBase>
  );
}
