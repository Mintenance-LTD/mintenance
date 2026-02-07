'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AdminCard } from '@/components/admin/AdminCard';
import type { Assessment } from './BuildingAssessmentsTypes';

interface BuildingAssessmentsTimelineProps {
  assessments: Assessment[];
}

export function BuildingAssessmentsTimeline({ assessments }: BuildingAssessmentsTimelineProps) {
  if (assessments.length === 0) return null;

  return (
    <AdminCard padding="lg" className="mb-6">
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: theme.spacing[6] }}>Recent Assessment Timeline</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4], position: 'relative', paddingLeft: theme.spacing[6] }}>
        {assessments.slice(0, 5).map((assessment, index) => (
          <div key={assessment.id} style={{ position: 'relative', paddingBottom: index < Math.min(assessments.length, 5) - 1 ? theme.spacing[4] : 0 }}>
            {index < Math.min(assessments.length, 5) - 1 && (
              <div style={{ position: 'absolute', left: '-20px', top: '24px', bottom: '-16px', width: '2px', backgroundColor: '#E2E8F0' }} />
            )}
            <div style={{ position: 'absolute', left: '-26px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: assessment.validation_status === 'validated' ? '#4CC38A' : assessment.validation_status === 'rejected' ? '#E74C3C' : '#F59E0B', border: '2px solid #FFFFFF', boxShadow: '0 0 0 2px #E2E8F0', zIndex: 1 }} />
            <div style={{ padding: theme.spacing[4], backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2], flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{assessment.damage_type.replace(/_/g, ' ')}</span>
                <span style={{
                  padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                  ...(assessment.validation_status === 'validated'
                    ? { backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #86EFAC' }
                    : assessment.validation_status === 'rejected'
                    ? { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                    : { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }),
                }}>{assessment.validation_status}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                {new Date(assessment.created_at).toLocaleString()} &bull; {assessment.user?.email || 'Unknown user'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}
