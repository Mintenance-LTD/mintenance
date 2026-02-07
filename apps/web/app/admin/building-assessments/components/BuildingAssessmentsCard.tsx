'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import type { Assessment } from './BuildingAssessmentsTypes';
import { getAutoValidationBadge } from './BuildingAssessmentsTypes';

interface BuildingAssessmentsCardProps {
  assessment: Assessment;
  loading: boolean;
  onReview: (assessment: Assessment) => void;
  onValidate: (assessmentId: string, validated: boolean) => void;
}

export function BuildingAssessmentsCard({ assessment, loading, onReview, onValidate }: BuildingAssessmentsCardProps) {
  const autoBadgeStyle = getAutoValidationBadge(assessment);

  return (
    <AdminCard padding="lg" hover className="mb-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
            <span style={{
              padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid',
              ...(assessment.validation_status === 'validated'
                ? { backgroundColor: '#D1FAE5', color: '#065F46', borderColor: '#86EFAC' }
                : assessment.validation_status === 'rejected'
                ? { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' }
                : { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' }),
            }}>
              {assessment.validation_status === 'validated' ? '✓ Validated' : assessment.validation_status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid',
              backgroundColor: assessment.severity === 'full' ? '#FEE2E2' : assessment.severity === 'midway' ? '#FEF3C7' : '#D1FAE5',
              color: assessment.severity === 'full' ? '#991B1B' : assessment.severity === 'midway' ? '#92400E' : '#065F46',
              borderColor: assessment.severity === 'full' ? '#FCA5A5' : assessment.severity === 'midway' ? '#FCD34D' : '#86EFAC',
            }}>
              {assessment.severity}
            </span>
            <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>{assessment.damage_type.replace(/_/g, ' ')}</span>
          </div>
          <div style={{ fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing[1] }}>
            {assessment.user?.first_name} {assessment.user?.last_name} ({assessment.user?.email})
          </div>
          <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Confidence: {assessment.confidence}% | Safety: {assessment.safety_score}/100 | Urgency: {assessment.urgency}
            {autoBadgeStyle && (
              <span style={{ marginLeft: theme.spacing[2], padding: `${theme.spacing[1]} ${theme.spacing[2]}`, backgroundColor: autoBadgeStyle.background, color: autoBadgeStyle.color, borderRadius: theme.borderRadius.full, fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold }}>
                {autoBadgeStyle.label}
              </span>
            )}
          </div>
          {assessment.images && assessment.images.length > 0 && (
            <div style={{ display: 'flex', gap: theme.spacing[2], marginTop: theme.spacing[3] }}>
              {assessment.images.slice(0, 4).map((img, idx) => (
                <img key={idx} src={img.image_url} alt={`Assessment ${idx + 1}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}` }} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
          <Button variant="primary" onClick={() => onReview(assessment)}>Review</Button>
          <Button variant="outline" onClick={() => window.open(`/building-assessments/${assessment.id}/correct`, '_blank')}>Correct Detections</Button>
          {(assessment.validation_status === 'pending' || (assessment.auto_validated && assessment.auto_validation_review_status === 'pending_review')) && (
            <>
              <Button variant="secondary" onClick={() => onValidate(assessment.id, true)} disabled={loading}>Validate</Button>
              <Button variant="outline" onClick={() => onValidate(assessment.id, false)} disabled={loading}>Reject</Button>
            </>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
