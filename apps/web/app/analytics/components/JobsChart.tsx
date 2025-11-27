import React from 'react';
import { theme } from '@/lib/theme';

interface JobsChartProps {
  data: Record<string, number>;
}

export function JobsChart({ data }: JobsChartProps) {
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
        Jobs Per Month
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
                      backgroundColor: theme.colors.primary,
                      borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
                      transition: 'height 0.3s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      padding: theme.spacing[2],
                    }}
                    title={`${value} jobs`}
                  >
                    <span style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: 'white',
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}>
                      {value}
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
          <p>No job data yet. Start bidding on jobs to see your activity trend.</p>
        </div>
      )}
    </div>
  );
}

