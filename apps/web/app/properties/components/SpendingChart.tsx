'use client';

import React from 'react';
import {
  DynamicLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/charts/DynamicCharts';

interface SpendingDataPoint {
  month: string;
  amount: number;
}

interface SpendingChartProps {
  data: SpendingDataPoint[];
  height?: number;
}

/**
 * SpendingChart Component
 * Displays spending trends over time for a property
 * Uses Recharts with dynamic imports for performance
 */
export function SpendingChart({ data, height = 300 }: SpendingChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <p className="text-gray-600 mb-2">No spending data available</p>
          <p className="text-sm text-gray-500">
            Complete jobs will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <DynamicLineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `£${value.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
          }}
          formatter={(value: number) => [`£${value.toLocaleString()}`, 'Spent']}
          labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#14b8a6"
          strokeWidth={2}
          dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </DynamicLineChart>
    </ResponsiveContainer>
  );
}

/**
 * Utility function to aggregate job spending by month
 * Groups completed jobs by month and calculates total spending
 */
export function aggregateSpendingByMonth(
  jobs: Array<{ date: string; amount: number; status: string }>
): SpendingDataPoint[] {
  // Only include completed jobs
  const completedJobs = jobs.filter((job) => job.status === 'completed');

  // Group by month
  const monthlySpending = new Map<string, number>();

  completedJobs.forEach((job) => {
    const date = new Date(job.date);
    const monthKey = date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
    });

    const currentAmount = monthlySpending.get(monthKey) || 0;
    monthlySpending.set(monthKey, currentAmount + job.amount);
  });

  // Convert to array and sort by date
  const data = Array.from(monthlySpending.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

  return data;
}
