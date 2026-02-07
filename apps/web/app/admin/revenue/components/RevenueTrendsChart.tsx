'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AdminCard } from '@/components/admin/AdminCard';
import { DynamicAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '@/components/charts/DynamicCharts';
import { formatCurrency } from './RevenueTypes';
import type { RevenueTrend } from './RevenueTypes';

interface RevenueTrendsChartProps {
  trends: RevenueTrend[];
}

export function RevenueTrendsChart({ trends }: RevenueTrendsChartProps) {
  return (
    <AdminCard padding="lg" className="mb-8">
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: theme.spacing[6] }}>Revenue Trends</h2>
      <ResponsiveContainer width="100%" height={400}>
        <DynamicAreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4CC38A" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4CC38A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickMargin={10} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickMargin={10} tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
            formatter={(value: number) => formatCurrency(value)}
            labelStyle={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#4CC38A" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
        </DynamicAreaChart>
      </ResponsiveContainer>
    </AdminCard>
  );
}
