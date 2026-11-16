import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BuildingAssessmentDisplay } from '@/app/jobs/[id]/components/BuildingAssessmentDisplay';
import { MintEditorialPropertySystemsTable } from '@/app/properties/[id]/components/MintEditorialPropertySystemsTable';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
afterEach(cleanup);
const legacy = {
  damageAssessment: {
    damageType: 'wall_crack',
    confidence: 100,
    severity: 'low',
    description: 'Synthetic finding',
  },
  safetyHazards: { overallSafetyScore: 100, hazards: [] },
  compliance: { complianceScore: 100, violations: [] },
  insuranceRisk: {
    riskScore: 0,
    premiumImpact: 'low',
    mitigationSuggestions: [],
  },
  urgency: { urgency: 'low', recommendedActionTimeline: 'Review photos' },
  contractorAdvice: {
    repairNeeded: [],
    materials: [],
    tools: [],
    estimatedCost: { min: 0, max: 0 },
    estimatedTime: 'Unknown',
  },
} as unknown as Phase1BuildingAssessment;
it('opens improvement guidance on a legacy assessment and qualifies confidence and risk', () => {
  render(
    <BuildingAssessmentDisplay
      assessment={legacy}
      jobId='qa-job'
      canEditPhotos
      photoUrls={['/test-photo.jpg']}
    />
  );
  expect(screen.getByText('100% model confidence')).toBeVisible();
  expect(screen.getByText('Professional verification required')).toBeVisible();
  expect(
    screen.getByText(/does not establish the photos’ origin/)
  ).toBeVisible();
  expect(
    screen.getByText('Model risk score — requires verification')
  ).toBeVisible();
  const action = screen.getByRole('button', { name: 'Improve Assessment' });
  fireEvent.click(action);
  expect(action).toHaveAttribute('aria-expanded', 'true');
  expect(
    screen.getByRole('region', { name: 'Improve assessment evidence' })
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Review job details and photos' })
  ).toHaveAttribute('href', '/jobs/qa-job/edit');
  fireEvent.click(action);
  expect(
    screen.queryByRole('region', { name: 'Improve assessment evidence' })
  ).toBeNull();
});
it('does not offer a forbidden photo editor on a read-only job view', () => {
  render(<BuildingAssessmentDisplay assessment={legacy} jobId='qa-job' />);
  fireEvent.click(screen.getByRole('button', { name: 'Improve Assessment' }));
  expect(
    screen.queryByRole('link', { name: 'Review job details and photos' })
  ).toBeNull();
  expect(screen.getByText(/Photo editing is not available/)).toBeVisible();
});
it.each([
  ['posted', 'Open for bids'],
  ['assigned', 'Assigned — work not started'],
  ['in_progress', 'In progress'],
])(
  'uses the recorded %s status in the property systems overview',
  (status, label) => {
    render(
      <MintEditorialPropertySystemsTable
        propertyId='property'
        jobs={[
          {
            id: 'job',
            title: 'QA plumbing',
            status,
            category: 'plumbing',
            date: '2026-11-16',
            amount: 100,
          },
        ]}
      />
    );
    expect(screen.getByText(label)).toBeVisible();
    if (status !== 'in_progress')
      expect(screen.queryByText('In progress')).toBeNull();
  }
);
