'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { formatCurrency } from './RevenueTypes';
import type { RevenueMetrics, MRRMetrics, ConversionRateData } from './RevenueTypes';

interface RevenueKPICardsProps {
  revenueMetrics: RevenueMetrics | null;
  mrr: MRRMetrics | null;
  conversionRate: ConversionRateData;
  arpc: number;
}

const kpiIconBox = (bg: string) => ({
  width: '48px', height: '48px', borderRadius: '12px', backgroundColor: bg,
  display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
});

const kpiLabel: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#64748B',
  textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
};

const kpiValue: React.CSSProperties = {
  fontSize: '28px', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: '1.2',
};

const subText: React.CSSProperties = { fontSize: '13px', color: '#64748B', margin: 0 };

export function RevenueKPICards({ revenueMetrics, mrr, conversionRate, arpc }: RevenueKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
      <AdminCard padding="lg" hover>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
          <div style={kpiIconBox('#EFF6FF')}><Icon name="currencyPound" size={24} color="#4A67FF" /></div>
          <h3 style={kpiLabel}>Total Revenue</h3>
        </div>
        <p style={kpiValue}>{formatCurrency(revenueMetrics?.totalRevenue || 0)}</p>
      </AdminCard>

      <AdminCard padding="lg" hover>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
          <div style={kpiIconBox('#D1FAE5')}><Icon name="currencyPound" size={24} color="#4CC38A" /></div>
          <h3 style={kpiLabel}>MRR</h3>
        </div>
        <p style={{ ...kpiValue, marginBottom: theme.spacing[1] }}>{formatCurrency(mrr?.totalMRR || 0)}</p>
        <p style={subText}>{mrr?.activeSubscriptions || 0} active subscriptions</p>
      </AdminCard>

      <AdminCard padding="lg" hover>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
          <div style={kpiIconBox('#FEF3C7')}><Icon name="trendingUp" size={24} color="#F59E0B" /></div>
          <h3 style={kpiLabel}>Conversion Rate</h3>
        </div>
        <p style={{ ...kpiValue, marginBottom: theme.spacing[1] }}>{conversionRate.conversionRate.toFixed(1)}%</p>
        <p style={subText}>{conversionRate.convertedTrials} of {conversionRate.totalTrials} trials</p>
      </AdminCard>

      <AdminCard padding="lg" hover>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
          <div style={kpiIconBox('#DBEAFE')}><Icon name="users" size={24} color="#3B82F6" /></div>
          <h3 style={kpiLabel}>ARPC</h3>
        </div>
        <p style={kpiValue}>{formatCurrency(arpc)}</p>
      </AdminCard>
    </div>
  );
}
