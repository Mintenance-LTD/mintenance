import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The early-access cohort waives phone verification for the first 50
 * homeowners. The boundary and the fail-closed behaviour are the whole
 * point of the rule, so both are pinned here: an off-by-one lets an
 * unbounded number of users past the gate, and a fail-OPEN error path
 * would turn a transient DB blip into a platform-wide bypass.
 */

const mockLt = vi.fn();
const mockEq = vi.fn(() => ({ lt: mockLt }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [])),
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  isInEarlyAccessCohort,
  isPhoneVerificationWaivedFor,
  EARLY_ACCESS_COHORT_SIZE,
} from '../EarlyAccessCohort';

const SIGNUP = '2026-07-29T10:00:00.000Z';

describe('isInEarlyAccessCohort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts only homeowners who signed up strictly earlier', async () => {
    mockLt.mockResolvedValue({ count: 0, error: null });

    await isInEarlyAccessCohort(SIGNUP);

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('id', {
      count: 'exact',
      head: true,
    });
    expect(mockEq).toHaveBeenCalledWith('role', 'homeowner');
    expect(mockLt).toHaveBeenCalledWith('created_at', SIGNUP);
  });

  it('waives the very first homeowner', async () => {
    mockLt.mockResolvedValue({ count: 0, error: null });
    await expect(isInEarlyAccessCohort(SIGNUP)).resolves.toBe(true);
  });

  it('waives the last member of the cohort', async () => {
    // 49 signed up earlier => this is homeowner #50.
    mockLt.mockResolvedValue({
      count: EARLY_ACCESS_COHORT_SIZE - 1,
      error: null,
    });
    await expect(isInEarlyAccessCohort(SIGNUP)).resolves.toBe(true);
  });

  it('gates the first homeowner past the cohort', async () => {
    // 50 signed up earlier => this is homeowner #51.
    mockLt.mockResolvedValue({ count: EARLY_ACCESS_COHORT_SIZE, error: null });
    await expect(isInEarlyAccessCohort(SIGNUP)).resolves.toBe(false);
  });

  it('fails closed when the count query errors', async () => {
    mockLt.mockResolvedValue({ count: null, error: new Error('db down') });
    await expect(isInEarlyAccessCohort(SIGNUP)).resolves.toBe(false);
  });

  it('fails closed when the count comes back null without an error', async () => {
    mockLt.mockResolvedValue({ count: null, error: null });
    await expect(isInEarlyAccessCohort(SIGNUP)).resolves.toBe(false);
  });

  it('fails closed on a missing signup timestamp, without querying', async () => {
    await expect(isInEarlyAccessCohort(null)).resolves.toBe(false);
    await expect(isInEarlyAccessCohort(undefined)).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

/**
 * The waiver skips the SMS round-trip, NOT the contact detail: an
 * assigned contractor still has to be able to reach the homeowner. A
 * homeowner with no number on file must never be waived, no matter how
 * early they signed up.
 */
describe('isPhoneVerificationWaivedFor', () => {
  const earlyHomeowner = {
    role: 'homeowner',
    phone: '+447700900123',
    phone_verified: false,
    created_at: SIGNUP,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // In the cohort unless a test says otherwise.
    mockLt.mockResolvedValue({ count: 0, error: null });
  });

  it('waives an early homeowner who has an unverified number on file', async () => {
    await expect(isPhoneVerificationWaivedFor(earlyHomeowner)).resolves.toBe(
      true
    );
  });

  it('does NOT waive an early homeowner with no number', async () => {
    await expect(
      isPhoneVerificationWaivedFor({ ...earlyHomeowner, phone: null })
    ).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does NOT waive when the number is only whitespace', async () => {
    await expect(
      isPhoneVerificationWaivedFor({ ...earlyHomeowner, phone: '   ' })
    ).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('reports nothing to waive once the phone is verified', async () => {
    await expect(
      isPhoneVerificationWaivedFor({
        ...earlyHomeowner,
        phone_verified: true,
      })
    ).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does not waive non-homeowners', async () => {
    await expect(
      isPhoneVerificationWaivedFor({ ...earlyHomeowner, role: 'contractor' })
    ).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does not waive a homeowner past the cohort even with a number', async () => {
    mockLt.mockResolvedValue({ count: EARLY_ACCESS_COHORT_SIZE, error: null });
    await expect(isPhoneVerificationWaivedFor(earlyHomeowner)).resolves.toBe(
      false
    );
  });
});
