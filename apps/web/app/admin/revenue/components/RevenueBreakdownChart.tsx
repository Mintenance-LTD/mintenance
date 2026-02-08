'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AdminCard } from '@/components/admin/AdminCard';
import { DynamicPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from '@/components/charts/DynamicCharts';
import { formatCurrency } from './RevenueTypes';
import type { RevenueMetrics } from './RevenueTypes';

interface RevenueBreakdownChartProps {
  revenueMetrics: RevenueMetrics;
}

export function RevenueBreakdownChart({ revenueMetrics }: RevenueBreakdownChartProps) {
  const pieData = [
    { name: 'Subscriptions', value: revenueMetrics.subscriptionRevenue || 0, color: '#4A67FF' },
    { name: 'Transaction Fees', value: revenueMetrics.transactionFeeRevenue || 0, color: '#4CC38A' },
  ];

  return (
    <AdminCard padding="lg" className="mb-8">
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: theme.spacing[6] }}>Revenue Breakdown</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[6], alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height={300}>
          <DynamicPieChart>
            <Pie
              data={pieData}
              cx="50%" cy="50%" labelLine={false}
              label={(props: { name: string; percent?: number }) => `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
              outerRadius={100} fill="#8884d8" dataKey="value"
            >
              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}
            />
          </DynamicPieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {[{ label: 'Subscription Revenue', color: '#4A67FF', value: revenueMetrics.subscriptionRevenue || 0, count: revenueMetrics.subscriptionCount || 0, unit: 'payments' },
            { label: 'Transaction Fees', color: '#4CC38A', value: revenueMetrics.transactionFeeRevenue || 0, count: revenueMetrics.transactionCount || 0, unit: 'transactions' },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: item.color }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: 0 }}>{item.label}</p>
              </div>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, marginBottom: '4px' }}>{formatCurrency(item.value)}</p>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{item.count} {item.unit}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminCard>
  );
}
