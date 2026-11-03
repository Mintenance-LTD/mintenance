import { describe, it, expect } from 'vitest';
import { parseContractConsent } from '../customer-consent';
import { CUSTOMER_TERMS_VERSION } from '@mintenance/shared';
const valid = {
  termsVersion: CUSTOMER_TERMS_VERSION,
  termsAccepted: true,
  expectedUpdatedAt: '2026-11-03T10:00:00Z',
  expectedReviewToken: '1'.repeat(32),
  earlyStartRequested: false,
  fullPerformanceAcknowledged: false,
};
describe('contract consent', () => {
  it('allows signing without optional early-start consent', () =>
    expect(parseContractConsent(valid, false).earlyStartRequested).toBe(false));
  it('allows early start without requiring a waiver acknowledgement', () =>
    expect(
      parseContractConsent({ ...valid, earlyStartRequested: true }, false)
        .fullPerformanceAcknowledged
    ).toBe(false));
  it.each([
    {},
    { ...valid, termsAccepted: false },
    { ...valid, termsVersion: 'old' },
    { ...valid, expectedReviewToken: undefined },
    { ...valid, earlyStartRequested: undefined },
    { ...valid, fullPerformanceAcknowledged: true },
  ])('rejects missing, stale or contradictory consent %#', (v) =>
    expect(() => parseContractConsent(v, false)).toThrow()
  );
  it('prevents contractors making customer choices', () =>
    expect(() =>
      parseContractConsent({ ...valid, earlyStartRequested: true }, true)
    ).toThrow());
});
