import React from 'react';
import { URGENCY_OPTIONS } from './types';
import type { JobFormData } from './types';

/**
 * Job-creation timeline step — Direction A · Mint Editorial.
 *
 * Budget input was removed 2026-05-22: anchoring contractors to a
 * homeowner-set ceiling pushed bids toward the cap and capped market
 * discovery. Contractors now bid their own price with a required
 * justification (see /api/contractor/submit-bid). The AI estimate, when
 * available, is shown read-only as a sanity check for the homeowner —
 * it is not sent to contractors.
 */

interface BudgetStepProps {
  formData: JobFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobFormData>>;
  hasImages: boolean;
  preferredDate: string;
  setPreferredDate: (date: string) => void;
  aiSuggestedBudget?: { min: number; max: number; confidence: number } | null;
}

const sectionLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--me-ink)',
  marginBottom: 10,
};

export function BudgetStep({
  formData,
  setFormData,
  preferredDate,
  setPreferredDate,
  aiSuggestedBudget,
}: BudgetStepProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
      data-testid='step-3-timeline'
    >
      <div>
        <h2 className='t-h2' style={{ marginBottom: 4 }}>
          Set your timeline
        </h2>
        <p className='t-body' style={{ margin: 0 }}>
          Contractors will bid their own price — you choose the bid that suits
          you best
        </p>
      </div>

      {/* AI cost hint — homeowner-only sanity check. Not shown to
          contractors. Helps frame incoming bids without anchoring them. */}
      {aiSuggestedBudget && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            background: 'var(--me-brand-soft)',
            border: '1px solid var(--me-brand)',
            borderRadius: 'var(--me-radius-card)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            AI
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--me-brand-2)',
              }}
            >
              Mint AI estimates £
              {Math.round(aiSuggestedBudget.min).toLocaleString()} – £
              {Math.round(aiSuggestedBudget.max).toLocaleString()}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 12,
                color: 'var(--me-ink-2)',
              }}
            >
              For your reference only ({aiSuggestedBudget.confidence}%
              confidence). Contractors will price the job themselves.
            </p>
          </div>
        </div>
      )}

      {/* Urgency */}
      <div>
        <span style={sectionLabelStyle}>When do you need this done?</span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {URGENCY_OPTIONS.map((option) => {
            const active = formData.urgency === option.value;
            return (
              <button
                key={option.value}
                type='button'
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    urgency: option.value as 'low' | 'medium' | 'high',
                  }))
                }
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 18,
                  textAlign: 'left',
                  borderRadius: 'var(--me-radius-card)',
                  border: `1.5px solid ${
                    active ? 'var(--me-brand)' : 'var(--me-line)'
                  }`,
                  background: active
                    ? 'var(--me-brand-soft)'
                    : 'var(--me-surface)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--me-ink)',
                    marginBottom: 2,
                  }}
                >
                  {option.label}
                </span>
                <span style={{ fontSize: 13, color: 'var(--me-ink-2)' }}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred Date */}
      <div>
        <label htmlFor='preferred-date' style={sectionLabelStyle}>
          Preferred start date (optional)
        </label>
        <input
          id='preferred-date'
          type='date'
          className='field'
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
    </div>
  );
}
