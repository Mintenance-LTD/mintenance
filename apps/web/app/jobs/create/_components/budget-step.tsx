import React from 'react';
import {
  BudgetRangeSelector,
  type BudgetData,
} from '../components/BudgetRangeSelector';
import { URGENCY_OPTIONS } from './types';
import type { JobFormData } from './types';

/**
 * Job-creation budget + timeline step — Direction A · Mint Editorial.
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
  hasImages,
  preferredDate,
  setPreferredDate,
  aiSuggestedBudget,
}: BudgetStepProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
      data-testid='step-3-budget'
    >
      <div>
        <h2 className='t-h2' style={{ marginBottom: 4 }}>
          Set your budget and timeline
        </h2>
        <p className='t-body' style={{ margin: 0 }}>
          This helps contractors provide accurate quotes
        </p>
      </div>

      {/* AI Budget Suggestion */}
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
              Based on damage assessment ({aiSuggestedBudget.confidence}%
              confidence). You can adjust below.
            </p>
          </div>
        </div>
      )}

      {/* Budget Range Selector (legacy component, palette-mapped via
          the page's .me-legacy-fit wrapper). */}
      <BudgetRangeSelector
        value={{
          budget: String(formData.budget),
          budget_min: String(formData.budget_min || ''),
          budget_max: String(formData.budget_max || ''),
          show_budget_to_contractors:
            formData.show_budget_to_contractors || false,
          require_itemized_bids: formData.require_itemized_bids || false,
        }}
        onChange={(budgetData: BudgetData) => {
          setFormData((prev) => ({
            ...prev,
            budget: budgetData.budget,
            budget_min: budgetData.budget_min,
            budget_max: budgetData.budget_max,
            show_budget_to_contractors: budgetData.show_budget_to_contractors,
            require_itemized_bids: budgetData.require_itemized_bids,
          }));
        }}
        hasImages={hasImages}
      />

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
