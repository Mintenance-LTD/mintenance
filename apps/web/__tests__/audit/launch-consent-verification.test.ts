import { beforeEach, expect, it, vi } from 'vitest';
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
  observeAnalyticsConsent,
  hasAnalyticsConsent,
} from '@/lib/analytics-consent';
const m = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
import { AutoVerificationService } from '@/lib/services/admin/AutoVerificationService';
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  m.from.mockReset();
});
it('defaults to no consent, applies opt-in and revocation including other tabs', () => {
  const apply = vi.fn();
  const dispose = observeAnalyticsConsent(apply);
  expect(apply).toHaveBeenLastCalledWith(false);
  localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({ version: '2.0', preferences: { analytics: true } })
  );
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  expect(apply).toHaveBeenLastCalledWith(true);
  localStorage.removeItem(COOKIE_CONSENT_KEY);
  window.dispatchEvent(
    new StorageEvent('storage', { key: COOKIE_CONSENT_KEY })
  );
  expect(apply).toHaveBeenLastCalledWith(false);
  dispose();
});
it('rejects corrupted and outdated preference records', () => {
  localStorage.setItem(COOKIE_CONSENT_KEY, '{bad');
  expect(hasAnalyticsConsent()).toBe(false);
  localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({ version: '1.0', preferences: { analytics: true } })
  );
  expect(hasAnalyticsConsent()).toBe(false);
});
it('does not award a verification badge merely because a profile passes completeness checks', async () => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn(async () => ({ data: [{ id: 'candidate' }], error: null })),
  };
  m.from.mockReturnValue(query);
  vi.spyOn(AutoVerificationService, 'evaluateContractor').mockResolvedValue({
    eligible: true,
    passedRules: ['profileComplete'],
    failedRules: [],
  });
  const result = await AutoVerificationService.processAutoVerifications();
  expect(result.verified).toBe(0);
  expect(result.details).toEqual([
    expect.objectContaining({
      status: 'skipped',
      reason: expect.stringContaining('manual'),
    }),
  ]);
  expect(m.from).toHaveBeenCalledTimes(1);
});
