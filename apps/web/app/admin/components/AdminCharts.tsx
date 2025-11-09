'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card.unified';
import { theme } from '@/lib/theme';

interface ChartDataPoint {
  date: string;
  users?: number;
  jobs?: number;
  cumulative?: number;
}

interface AdminChartsProps {
  userGrowth: ChartDataPoint[];
  jobGrowth: ChartDataPoint[];
}

export function AdminCharts({ userGrowth, jobGrowth }: AdminChartsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
      gap: theme.spacing[6],
      marginTop: theme.spacing[8],
    }}>
      {/* User Growth Chart */}
      <Card style={{ padding: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}>
          User Growth (30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={userGrowth}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              stroke="#6B7280"
              style={{ fontSize: theme.typography.fontSize.xs }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: theme.typography.fontSize.xs }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUsers)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Job Growth Chart */}
      <Card style={{ padding: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}>
          Job Creation (30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={jobGrowth}>
            <defs>
              <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              stroke="#6B7280"
              style={{ fontSize: theme.typography.fontSize.xs }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: theme.typography.fontSize.xs }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
              }}
            />
            <Bar 
              dataKey="jobs" 
              fill="url(#colorJobs)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Daily Activity Comparison */}
      <Card style={{ padding: theme.spacing[6], gridColumn: '1 / -1' }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}>
          Daily Activity Comparison
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={userGrowth.map((item, index) => ({
            ...item,
            jobs: jobGrowth[index]?.jobs || 0,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              stroke="#6B7280"
              style={{ fontSize: theme.typography.fontSize.xs }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: theme.typography.fontSize.xs }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="users" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              name="New Users"
            />
            <Line 
              type="monotone" 
              dataKey="jobs" 
              stroke="#10B981" 
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 4 }}
              name="New Jobs"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

