'use client';

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
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 group relative overflow-hidden"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}
    >
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
      <div>
        <h2
          className="text-subheading-md font-[560] text-gray-900 tracking-normal mb-1"
          style={{
            margin: 0,
            marginBottom: theme.spacing[1],
          }}
        >
          Weekly Performance
        </h2>
        <p
          className="text-sm font-[460] text-gray-600"
          style={{
            margin: 0,
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
          className="text-base font-[560] text-gray-900 mb-1"
          style={{
            margin: 0,
            marginBottom: theme.spacing[1],
          }}
        >
          Revenue by Week
        </h3>
        <BarChart data={revenueData} height={120} showValues={true} />
      </div>
    </div>
  );
}

