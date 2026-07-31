import { describe, it, expect } from 'vitest';
import { computeNextStep, buildLifecyclePhases } from '../jobDetailHelpers';

const JOB_ID = 'a1b2c3d4-0000-0000-0000-000000000000';

const base = {
  jobStatus: 'assigned',
  bidCount: 2,
  contractorAssigned: true,
  contractStatus: null as string | null,
  escrowStatus: null as string | null,
  completionConfirmed: false,
};

describe('computeNextStep', () => {
  it('routes the escrow-funding CTA to the standalone payment page (2026-07-31 audit P0 — was a dead #payment-section anchor)', () => {
    const step = computeNextStep(
      { ...base, contractStatus: 'accepted', escrowStatus: 'pending' },
      JOB_ID
    );
    expect(step.title).toBe('Pay into escrow');
    expect(step.cta).toEqual({
      label: 'Pay now',
      href: `/jobs/${JOB_ID}/payment`,
    });
  });

  it('does not ask for payment again once escrow is funded', () => {
    const step = computeNextStep(
      { ...base, contractStatus: 'accepted', escrowStatus: 'held' },
      JOB_ID
    );
    expect(step.title).not.toBe('Pay into escrow');
  });

  it('asks for contract signature before payment', () => {
    const step = computeNextStep(base, JOB_ID);
    expect(step.title).toBe('Sign the contract');
    expect(step.cta?.href).toBe('#contract-section');
  });

  it('points at the photo review once work completes unconfirmed', () => {
    const step = computeNextStep(
      {
        ...base,
        jobStatus: 'completed',
        contractStatus: 'accepted',
        escrowStatus: 'held',
      },
      JOB_ID
    );
    expect(step.cta?.href).toBe('#photo-review');
  });
});

describe('buildLifecyclePhases', () => {
  it('marks escrow as the current phase when the contract is signed but unfunded', () => {
    const phases = buildLifecyclePhases({
      ...base,
      contractStatus: 'accepted',
      escrowStatus: 'pending',
    });
    expect(phases.find((p) => p.id === 'escrow')?.status).toBe('current');
    expect(phases.find((p) => p.id === 'contract')?.status).toBe('done');
  });
});
