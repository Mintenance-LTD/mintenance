import React from 'react';
import { theme } from '@/lib/theme';
import { BarChart } from '@/components/ui/SimpleChart';

interface BarChartsSectionProps {
  jobsData?: Array<{ label: string; value: number; color?: string }>;
  revenueData?: Array<{ label: string; value: number; color?: string }>;
}

export function BarChartsSection({
  jobsData = [
    { label: 'Mon', value: 12, color: theme.colors.primary },
    { label: 'Tue', value: 19, color: theme.colors.primary },
    { label: 'Wed', value: 15, color: theme.colors.primary },
    { label: 'Thu', value: 22, color: theme.colors.primary },
    { label: 'Fri', value: 18, color: theme.colors.primary },
    { label: 'Sat', value: 10, color: theme.colors.primary },
    { label: 'Sun', value: 8, color: theme.colors.primary },
  ],
  revenueData = [
    { label: 'Week 1', value: 4500, color: theme.colors.success },
    { label: 'Week 2', value: 5200, color: theme.colors.success },
    { label: 'Week 3', value: 4800, color: theme.colors.success },
    { label: 'Week 4', value: 6100, color: theme.colors.success },
  ],
}: BarChartsSectionProps) {
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
        gap: theme.spacing[6],
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}
        >
          Weekly Performance
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}
        >
          Jobs completed this week
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <BarChart data={jobsData} height={180} showValues={true} />
      </div>

      <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: theme.spacing[6] }}>
        <h3
          style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}
        >
          Revenue by Week
        </h3>
        <BarChart data={revenueData} height={120} showValues={true} />
      </div>
    </div>
  );
}

