'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AdminCard } from '@/components/admin/AdminCard';
import { DynamicBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '@/components/charts/DynamicCharts';
import { formatCurrency } from './RevenueTypes';
import type { MRRMetrics } from './RevenueTypes';

interface RevenueMRRChartProps {
  mrr: MRRMetrics;
}

export function RevenueMRRChart({ mrr }: RevenueMRRChartProps) {
  const chartData = Object.entries(mrr.mrrByPlan).map(([plan, data]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    mrr: data.mrr,
    subscribers: data.count,
  }));

  return (
    <AdminCard padding="lg" className="mb-8">
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: theme.spacing[6] }}>MRR by Plan</h2>
      <ResponsiveContainer width="100%" height={400}>
        <DynamicBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickMargin={10} />
          <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickMargin={10} tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
            formatter={(value: number) => formatCurrency(value)}
            labelStyle={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}
          />
          <Bar dataKey="mrr" fill="#4A67FF" radius={[8, 8, 0, 0]} />
        </DynamicBarChart>
      </ResponsiveContainer>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing[4], marginTop: theme.spacing[6], paddingTop: theme.spacing[6], borderTop: '1px solid #E2E8F0' }}>
        {Object.entries(mrr.mrrByPlan).map(([plan, data]) => (
          <div key={plan} style={{ padding: theme.spacing[4], backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, marginBottom: '8px' }}>{plan}</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, marginBottom: '4px' }}>{formatCurrency(data.mrr)}</p>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{data.count} subscribers</p>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}
