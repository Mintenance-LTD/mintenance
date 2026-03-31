'use client';

import React from 'react';
import { Card } from '@/components/ui/Card.unified';
import { theme } from '@/lib/theme';
import {
  DynamicBarChart,
  DynamicPieChart,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/charts';
import type { SecurityMetrics } from './SecurityMetricsCards';

const SEVERITY_COLORS = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#FCD34D',
  low: '#10B981',
};

interface SecurityChartsProps {
  metrics: SecurityMetrics;
}

export function SecurityCharts({ metrics }: SecurityChartsProps) {
  const eventTypeChartData = Object.entries(metrics.top_event_types)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({
      name: type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: count,
    }));

  const severityChartData = [
    {
      name: 'Critical',
      value: metrics.critical_events,
      color: SEVERITY_COLORS.critical,
    },
    {
      name: 'High',
      value: metrics.high_severity_events,
      color: SEVERITY_COLORS.high,
    },
    {
      name: 'Medium',
      value:
        metrics.total_events -
        metrics.critical_events -
        metrics.high_severity_events,
      color: SEVERITY_COLORS.medium,
    },
  ].filter((item) => item.value > 0);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: theme.spacing[6],
        marginBottom: theme.spacing[8],
      }}
    >
      {eventTypeChartData.length > 0 && (
        <Card style={{ padding: theme.spacing[6] }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
            }}
          >
            Top Event Types
          </h3>
          <ResponsiveContainer width='100%' height={300}>
            <DynamicBarChart data={eventTypeChartData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' />
              <XAxis
                dataKey='name'
                stroke='#6B7280'
                style={{ fontSize: theme.typography.fontSize.xs }}
              />
              <YAxis
                stroke='#6B7280'
                style={{ fontSize: theme.typography.fontSize.xs }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                }}
              />
              <Bar dataKey='value' fill='#3B82F6' radius={[8, 8, 0, 0]} />
            </DynamicBarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {severityChartData.length > 0 && (
        <Card style={{ padding: theme.spacing[6] }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
            }}
          >
            Severity Distribution
          </h3>
          <ResponsiveContainer width='100%' height={300}>
            <DynamicPieChart>
              <Pie
                data={severityChartData}
                cx='50%'
                cy='50%'
                labelLine={false}
                label={(entry: { name: string; percent: number }) =>
                  `${entry.name} ${(entry.percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill='#8884d8'
                dataKey='value'
              >
                {severityChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </DynamicPieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
