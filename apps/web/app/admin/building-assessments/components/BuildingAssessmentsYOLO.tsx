'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import type { CorrectionStats } from './BuildingAssessmentsTypes';

interface BuildingAssessmentsYOLOProps {
  correctionStats: CorrectionStats;
  hasAssessments: boolean;
}

export function BuildingAssessmentsYOLO({ correctionStats, hasAssessments }: BuildingAssessmentsYOLOProps) {
  return (
    <AdminCard padding="lg" className="mb-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="brain" size={24} color="#3B82F6" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, marginBottom: '4px' }}>YOLO Continuous Learning</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Help improve the AI model by correcting detections. {correctionStats.approved} approved corrections collected.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing[4], marginBottom: theme.spacing[4] }}>
        <AdminMetricCard label="Approved Corrections" value={correctionStats.approved} icon="checkCircle" iconColor="#10B981" />
        <AdminMetricCard label="Pending Review" value={correctionStats.pending} icon="clock" iconColor="#F59E0B" />
        <AdminMetricCard label="Needed for Retrain" value={correctionStats.needed} icon="target" iconColor="#3B82F6" />
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: theme.spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing[2] }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Progress to Next Retrain</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{correctionStats.approved} / 100</span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (correctionStats.approved / 100) * 100)}%`, height: '100%', backgroundColor: '#3B82F6', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {hasAssessments && (
        <div style={{ padding: theme.spacing[4], backgroundColor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0, marginBottom: '4px' }}>Start Improving the AI Model</p>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Click &quot;Correct Detections&quot; on any assessment to fix AI errors and help train better models.
              </p>
            </div>
            <Icon name="arrowRight" size={20} color="#3B82F6" />
          </div>
        </div>
      )}
    </AdminCard>
  );
}
