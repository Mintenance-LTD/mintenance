'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { theme } from '@/lib/theme';

interface ProgressTrendChartProps {
  data: Array<{ month: string; completionRate: number }>;
}

/**
 * Progress Trend Chart - Shows completion rate trends over time
 */
export function ProgressTrendChart({ data }: ProgressTrendChartProps) {
  const chartData = data.map((item) => ({
    name: item.month,
    value: Math.round(item.completionRate),
  }));

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#6B7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tickMargin={8}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}%`, 'Completion Rate']}
            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
          />
          <Bar
            dataKey="value"
            fill={theme.colors.secondary}
            radius={[8, 8, 0, 0]}
            name="Completion Rate"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

