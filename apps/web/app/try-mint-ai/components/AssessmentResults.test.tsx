import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssessmentResults } from './AssessmentResults';
import type { AssessmentResult } from './TryMintAIClient';

afterEach(cleanup);

const incompleteResult: AssessmentResult = {
  damageType: 'Unknown',
  severity: null,
  costEstimate: null,
  confidence: null,
  details: {
    description: 'More evidence is needed.',
    urgency: 'Not assessed',
    safetyRisk: 'Photos alone cannot establish whether the property is safe.',
    recommendations: [],
  },
};

describe('Mint AI public demo results', () => {
  it('does not show invented numbers or a confidence meter for missing evidence', () => {
    render(
      <AssessmentResults
        result={incompleteResult}
        onAccuracyFeedback={vi.fn()}
      />
    );
    expect(screen.getByText('Not assessed')).toBeTruthy();
    expect(screen.getByText('Not available')).toBeTruthy();
    expect(
      screen.getByText('No reliable estimate from these photos.')
    ).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('renders an explicitly returned zero as zero, not 75%', () => {
    render(
      <AssessmentResults
        result={{ ...incompleteResult, confidence: 0 }}
        onAccuracyFeedback={vi.fn()}
      />
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '0'
    );
    expect(screen.queryByText('75%')).toBeNull();
  });

  it('keeps possible critical hazards visible without expanding the results', () => {
    render(
      <AssessmentResults
        result={{ ...incompleteResult, criticalHazard: true }}
        onAccuracyFeedback={vi.fn()}
      />
    );
    expect(screen.getByRole('alert').textContent).toMatch(
      /Potential serious hazard/
    );
  });
});
