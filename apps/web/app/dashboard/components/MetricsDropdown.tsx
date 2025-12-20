'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { DashboardMetric } from './dashboard-metrics.types';

interface MetricsDropdownProps {
  metrics: DashboardMetric[];
  onClose: () => void;
  onViewProfile?: () => void;
}

export function MetricsDropdown({ metrics, onClose, onViewProfile }: MetricsDropdownProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Additional metrics"
      style={{
        position: 'absolute',
        top: '60px',
        right: '24px',
        width: '360px',
        maxHeight: '480px',
        borderRadius: theme.borderRadius['2xl'],
        backgroundColor: theme.colors.white,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: '0px 20px 25px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            Additional Metrics
          </h3>
          <p
            style={{
              margin: 0,
              marginTop: '4px',
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            Quick glance at the rest of your KPIs
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close metrics dropdown"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <Icon name="x" size={18} color={theme.colors.textSecondary} />
        </Button>
      </div>

      <div
        style={{
          padding: '16px 0',
          overflowY: 'auto',
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '14px 20px',
              borderBottom: `1px solid ${theme.colors.borderLight}`,
              transition: 'background-color 0.2s ease',
            }}
            className="hover:bg-gray-50 last:border-0"
          >
            <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: theme.borderRadius.lg,
              backgroundColor: `${metric.iconColor || theme.colors.primary}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            >
              <Icon name={metric.icon} size={20} color={metric.iconColor || theme.colors.primary} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {metric.label}
                </span>
                {metric.trend && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: theme.typography.fontSize.xs,
                      color:
                        metric.trend.direction === 'up'
                          ? theme.colors.success
                          : metric.trend.direction === 'down'
                          ? theme.colors.error
                          : theme.colors.textSecondary,
                    }}
                  >
                    <Icon
                      name={
                        metric.trend.direction === 'up'
                          ? 'arrowUpRight'
                          : metric.trend.direction === 'down'
                          ? 'arrowDownRight'
                          : 'minus'
                      }
                      size={14}
                      color={
                        metric.trend.direction === 'up'
                          ? theme.colors.success
                          : metric.trend.direction === 'down'
                          ? theme.colors.error
                          : theme.colors.textSecondary
                      }
                    />
                    {metric.trend.value}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginTop: '4px',
                  lineHeight: 1.2,
                }}
              >
                {metric.value}
              </div>
              {metric.subtitle && (
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {metric.subtitle}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}
      >
        {onViewProfile && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onViewProfile();
              onClose();
            }}
          >
            View profile
          </Button>
        )}
      </div>
    </div>
  );
}

