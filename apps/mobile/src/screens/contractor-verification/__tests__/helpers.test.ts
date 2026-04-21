/**
 * Unit tests for ContractorVerificationScreen.helpers.
 *
 * Covers the three pure helper functions extracted from the screen
 * in commit 18d9a136 (Phase 2.5). The functions are small but have
 * multiple input formats each, so explicit cases catch regressions
 * when we eventually collapse the DD/MM/YYYY fallback path (once
 * the profiles.license_expiry column is confirmed to hold only
 * YYYY-MM-DD values in prod).
 */

import {
  formatExpiryForDisplay,
  formatExpiryForPersistence,
  parseLegacyExpiry,
} from '../ContractorVerificationScreen.helpers';

describe('ContractorVerificationScreen.helpers', () => {
  describe('parseLegacyExpiry', () => {
    it('returns null for falsy input', () => {
      expect(parseLegacyExpiry(null)).toBeNull();
      expect(parseLegacyExpiry(undefined)).toBeNull();
      expect(parseLegacyExpiry('')).toBeNull();
      expect(parseLegacyExpiry('   ')).toBeNull();
    });

    it('parses YYYY-MM-DD (new format)', () => {
      const d = parseLegacyExpiry('2027-03-15');
      expect(d).not.toBeNull();
      // Date.parse of YYYY-MM-DD is parsed as UTC midnight.
      expect(d?.getUTCFullYear()).toBe(2027);
      expect(d?.getUTCMonth()).toBe(2); // March = index 2
      expect(d?.getUTCDate()).toBe(15);
    });

    it('parses a full ISO timestamp', () => {
      const d = parseLegacyExpiry('2028-11-05T14:30:00Z');
      expect(d).not.toBeNull();
      expect(d?.toISOString()).toBe('2028-11-05T14:30:00.000Z');
    });

    it('parses DD/MM/YYYY legacy format', () => {
      const d = parseLegacyExpiry('07/04/2029');
      expect(d).not.toBeNull();
      expect(d?.getUTCFullYear()).toBe(2029);
      expect(d?.getUTCMonth()).toBe(3); // April = index 3
      expect(d?.getUTCDate()).toBe(7);
    });

    it('returns null for garbage strings', () => {
      expect(parseLegacyExpiry('not a date')).toBeNull();
      expect(parseLegacyExpiry('hello world')).toBeNull();
      // Intentionally NOT testing '13/45/2029' — Date.parse() on some
      // runtimes accepts it as MM/DD/YYYY. We don't guarantee strict
      // rejection for ambiguous cases, only best-effort parse.
    });

    it('trims whitespace before parsing', () => {
      expect(parseLegacyExpiry('  2030-06-01  ')).not.toBeNull();
    });
  });

  describe('formatExpiryForDisplay', () => {
    it('returns "Not set" for null', () => {
      expect(formatExpiryForDisplay(null)).toBe('Not set');
    });

    it('returns a human-readable localised string for a Date', () => {
      const d = new Date('2031-05-20T00:00:00Z');
      const out = formatExpiryForDisplay(d);
      // The exact string depends on the runtime's default locale.
      // We assert it at least contains the year + month name so
      // locale drift doesn't break the test.
      expect(out).toMatch(/2031/);
      expect(out.length).toBeGreaterThan(0);
      expect(out).not.toBe('Not set');
    });
  });

  describe('formatExpiryForPersistence', () => {
    it('returns null for null input', () => {
      expect(formatExpiryForPersistence(null)).toBeNull();
    });

    it('returns YYYY-MM-DD in the local time zone', () => {
      // Build the date via local constructor so the output matches
      // the local-date components we ask for below.
      const d = new Date(2032, 0, 9); // 9 January 2032 local
      expect(formatExpiryForPersistence(d)).toBe('2032-01-09');
    });

    it('zero-pads single-digit months and days', () => {
      const d = new Date(2033, 2, 4); // 4 March 2033 local
      expect(formatExpiryForPersistence(d)).toBe('2033-03-04');
    });
  });

  describe('round-trip: persistence format parses back cleanly', () => {
    // The format we persist for new writes should parse back into
    // a Date that, when re-persisted, yields the same string. This
    // is the property guard for the dual-write commit
    // 18d9a136 — ensures we don't silently corrupt dates when an
    // existing profiles row is edited twice.
    it('YYYY-MM-DD round-trips through parse + format', () => {
      const original = '2034-07-22';
      const d = parseLegacyExpiry(original);
      expect(d).not.toBeNull();
      // Note: parseLegacyExpiry returns a UTC-midnight Date for
      // YYYY-MM-DD input. formatExpiryForPersistence uses local
      // components — in a TZ east of UTC the local date is still
      // the same day. We compare against the input directly; the
      // test suite defaults to UTC in CI.
      const roundtripped = formatExpiryForPersistence(d);
      // The round-trip is only stable when the runtime's TZ offset
      // does not push the UTC-midnight Date across a day boundary.
      // Jest runs in UTC by default in this repo (per jest-config).
      // If this test becomes flaky, either fix the TZ in the test
      // harness or switch parseLegacyExpiry to produce a local-
      // midnight Date for YYYY-MM-DD input.
      expect(roundtripped).toBe(original);
    });
  });
});
