'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { CircularProgress } from '@/components/ui/CircularProgress';
import type { Statistics } from './BuildingAssessmentsTypes';
import { formatPercentage } from './BuildingAssessmentsTypes';

interface BuildingAssessmentsAutoValidationProps {
  statistics: Statistics;
}

export function BuildingAssessmentsAutoValidation({ statistics }: BuildingAssessmentsAutoValidationProps) {
  if (!statistics.autoValidation) return null;
  const av = statistics.autoValidation;

  return (
    <AdminCard padding="lg" className="mb-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[6], paddingBottom: theme.spacing[4], borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="target" size={24} color="#4A67FF" />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, marginBottom: '4px' }}>Auto-Validation Performance</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            {av.total} auto-validated &bull; {av.confirmed} confirmed &bull; {av.overturned} overturned
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing[6], marginBottom: theme.spacing[6] }}>
        {av.precision !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing[3] }}>
            <CircularProgress value={(av.precision || 0) * 100} size={120} strokeWidth={10} label="Precision" showPercentage={true} />
          </div>
        )}
        {av.recall !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing[3] }}>
            <CircularProgress value={(av.recall || 0) * 100} size={120} strokeWidth={10} label="Recall" showPercentage={true} />
          </div>
        )}
        {av.coverage !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing[3] }}>
            <CircularProgress value={(av.coverage || 0) * 100} size={120} strokeWidth={10} label="Coverage" showPercentage={true} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: theme.spacing[4], paddingTop: theme.spacing[4], borderTop: '1px solid #E2E8F0' }}>
        <AdminMetricCard label="Pending Rate" value={formatPercentage(av.pendingRate)} icon="progress" iconColor="#F59E0B" />
        <AdminMetricCard label="Confirmed" value={av.confirmed} icon="checkCircle" iconColor={theme.colors.success} />
        <AdminMetricCard label="Overturned" value={av.overturned} icon="alertTriangle" iconColor={theme.colors.error} />
      </div>
    </AdminCard>
  );
}
