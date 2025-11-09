'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { theme } from '@/lib/theme';

interface EnhancedChartProps {
  title?: string;
  subtitle?: string;
  data?: Array<{ label: string; value: number; revenue?: number; expenses?: number; profit?: number }>;
  type?: 'line' | 'bar' | 'area';
  height?: number;
  showLegend?: boolean;
}

/**
 * Enhanced Chart Component using Recharts
 * Replaces the SimpleChart with a more powerful Recharts implementation
 */
export function EnhancedChart({
  title = 'Revenue Overview',
  subtitle = 'Last 6 months',
  data = [
    { label: 'Jan', value: 4500 },
    { label: 'Feb', value: 5200 },
    { label: 'Mar', value: 4800 },
    { label: 'Apr', value: 6100 },
    { label: 'May', value: 5500 },
    { label: 'Jun', value: 6800 },
  ],
  type = 'line',
  height = 300,
  showLegend = true,
}: EnhancedChartProps) {
  // Transform data for Recharts
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
    revenue: item.revenue ?? item.value,
    expenses: item.expenses ?? item.value * 0.6,
    profit: item.profit ?? item.value * 0.4,
  }));

  return (
    <div
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: theme.spacing[5] }}>
        <h2
          className="text-subheading-md font-[560] text-gray-900 tracking-normal mb-1"
          style={{
            margin: 0,
            marginBottom: theme.spacing[1],
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-sm font-[460] text-gray-600"
            style={{
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height={height}>
          {type === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              />
              {showLegend && <Legend />}
              <Bar
                dataKey="revenue"
                fill={theme.colors.success}
                radius={[8, 8, 0, 0]}
                name="Revenue"
              />
              {chartData.some((d) => d.expenses) && (
                <Bar
                  dataKey="expenses"
                  fill={theme.colors.error}
                  radius={[8, 8, 0, 0]}
                  name="Expenses"
                />
              )}
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={theme.colors.success}
                strokeWidth={2}
                dot={{ fill: theme.colors.success, r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue"
              />
              {chartData.some((d) => d.expenses) && (
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke={theme.colors.error}
                  strokeWidth={2}
                  dot={{ fill: theme.colors.error, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Expenses"
                />
              )}
              {chartData.some((d) => d.profit) && (
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={theme.colors.primary}
                  strokeWidth={2}
                  dot={{ fill: theme.colors.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Profit"
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Dashboard Revenue Chart Component
 * Specifically designed for dashboard revenue tracking
 */
interface DashboardRevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    expenses?: number;
    profit?: number;
  }>;
}

export function DashboardRevenueChart({ data }: DashboardRevenueChartProps) {
  return (
    <EnhancedChart
      title="Revenue Overview"
      subtitle="Last 6 months"
      data={data.map((item) => ({
        label: item.month,
        revenue: item.revenue,
        expenses: item.expenses,
        profit: item.profit,
      }))}
      type="line"
      height={300}
      showLegend={true}
    />
  );
}

