'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface RevenueChartProps {
  data: Record<string, number>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const months = Object.keys(data);
  const values = Object.values(data);
  const maxValue = Math.max(...values, 1);

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border}`,
    }}>
      <h3 style={{
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing[6],
      }}>
        Revenue Trend
      </h3>

      {months.length > 0 ? (
        <div style={{ position: 'relative', height: '300px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            height: '100%',
            gap: theme.spacing[2],
          }}>
            {months.map((month, index) => {
              const value = values[index];
              const heightPercent = (value / maxValue) * 100;

              return (
                <div
                  key={month}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPercent}%`,
                      backgroundColor: theme.colors.success,
                      borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
                      transition: 'height 0.3s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      padding: theme.spacing[2],
                    }}
                    title={`£${value.toLocaleString()}`}
                  >
                    <span style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: 'white',
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}>
                      £{(value / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <span style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    transform: 'rotate(-45deg)',
                    whiteSpace: 'nowrap',
                  }}>
                    {month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textSecondary,
        }}>
          <p>No revenue data yet. Complete jobs to see your revenue trend.</p>
        </div>
      )}
    </div>
  );
}

