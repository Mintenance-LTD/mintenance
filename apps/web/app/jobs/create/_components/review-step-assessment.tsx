import React from 'react';
import type { BuildingAssessmentData } from './types';

/**
 * Mint AI assessment summary block for the job-creation review step —
 * Direction A · Mint Editorial. Extracted from review-step.tsx to keep
 * that file under the 500-line per-file cap.
 */

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--me-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
};

export function AssessmentSummary({
  assessment,
  onViewDetails,
}: {
  assessment: BuildingAssessmentData;
  onViewDetails: () => void;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>
          Mint AI assessment
        </div>
        <button
          type='button'
          onClick={onViewDetails}
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--me-brand)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          View details
        </button>
      </div>
      <div
        style={{
          background: 'var(--me-brand-soft)',
          borderRadius: 'var(--me-radius-card)',
          padding: 18,
          border: '1px solid var(--me-brand)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            AI
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--me-ink)',
              }}
            >
              {assessment.damageAssessment.damageType
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
            <div style={{ fontSize: 13, color: 'var(--me-ink-2)' }}>
              Severity:{' '}
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                {assessment.damageAssessment.severity}
              </span>{' '}
              · {assessment.damageAssessment.confidence}% confidence
            </div>
          </div>
          {assessment.safetyHazards.hasSafetyHazards && (
            <span className='badge badge-err'>Safety alert</span>
          )}
        </div>

        <p
          style={{
            margin: '0 0 14px',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--me-ink-2)',
          }}
        >
          {assessment.damageAssessment.description}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          <AssessmentTile
            label='Urgency'
            value={assessment.urgency.urgency}
            sub={assessment.urgency.reasoning}
            capitalize
          />
          {assessment.estimatedCost && (
            <AssessmentTile
              label='Estimated cost'
              value={`£${Math.round(
                assessment.estimatedCost.min
              ).toLocaleString()} – £${Math.round(
                assessment.estimatedCost.max
              ).toLocaleString()}`}
              sub={`${assessment.estimatedCost.confidence}% confidence`}
            />
          )}
          {assessment.compliance && (
            <AssessmentTile
              label='Compliance score'
              value={`${assessment.compliance.complianceScore}%`}
              sub={
                assessment.compliance.flags.length > 0
                  ? assessment.compliance.flags.join(', ')
                  : undefined
              }
            />
          )}
        </div>

        {assessment.safetyHazards.hasSafetyHazards &&
          assessment.safetyHazards.criticalFlags.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: 'var(--me-err-bg)',
                border: '1px solid var(--me-err-fg)',
                borderRadius: 'var(--me-radius-input)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--me-err-fg)',
                  marginBottom: 2,
                }}
              >
                Safety hazards
              </div>
              <div style={{ fontSize: 12, color: 'var(--me-err-fg)' }}>
                {assessment.safetyHazards.criticalFlags.join(', ')}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

function AssessmentTile({
  label,
  value,
  sub,
  capitalize,
}: {
  label: string;
  value: string;
  sub?: string;
  capitalize?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--me-surface)',
        borderRadius: 'var(--me-radius-input)',
        padding: 12,
        border: '1px solid var(--me-line)',
      }}
    >
      <div style={fieldLabelStyle}>{label}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--me-ink)',
          textTransform: capitalize ? 'capitalize' : 'none',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--me-ink-3)',
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
