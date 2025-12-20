import React from 'react';
import { theme } from '@/lib/theme';
import { LineChart } from '@/components/ui/SimpleChart';

interface LargeChartProps {
  title?: string;
  subtitle?: string;
  data?: Array<{ label: string; value: number }>;
}

export function LargeChart({ 
  title = 'Revenue Overview', 
  subtitle = 'Last 6 months',
  data = [
    { label: 'Jan', value: 4500 },
    { label: 'Feb', value: 5200 },
    { label: 'Mar', value: 4800 },
    { label: 'Apr', value: 6100 },
    { label: 'May', value: 5500 },
    { label: 'Jun', value: 6800 },
  ]
}: LargeChartProps) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: theme.spacing[5] }}>
        <h2
          style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <LineChart data={data} height={300} color={theme.colors.primary} />
      </div>
    </div>
  );
}

