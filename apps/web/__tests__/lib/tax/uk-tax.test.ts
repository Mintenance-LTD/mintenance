/**
 * UK tax helper tests (Task 2, UK market readiness).
 *
 * Pins the UK tax-year boundary (6 April – 5 April) and the identity-format
 * validators used by the contractor tax-identity capture + earnings statement.
 */
import { describe, it, expect } from 'vitest';
import {
  ukTaxYearFromStartYear,
  ukTaxYearForDate,
  parseUKTaxYearLabel,
  UTR_REGEX,
  NINO_REGEX,
  VAT_NUMBER_REGEX,
  COMPANY_NUMBER_REGEX,
  normaliseNINO,
  normaliseVatNumber,
} from '@/lib/services/tax/uk-tax';

describe('UK tax year (6 April – 5 April)', () => {
  it('labels a start year correctly (2025 → 2025-26)', () => {
    const ty = ukTaxYearFromStartYear(2025);
    expect(ty.label).toBe('2025-26');
    expect(ty.start.toISOString()).toBe('2025-04-06T00:00:00.000Z');
    expect(ty.end.toISOString()).toBe('2026-04-05T23:59:59.999Z');
  });

  it('places 6 April in the tax year that starts that day', () => {
    expect(ukTaxYearForDate(new Date('2025-04-06T00:00:00Z')).startYear).toBe(
      2025
    );
  });

  it('places 5 April in the PREVIOUS tax year (year-end boundary)', () => {
    const ty = ukTaxYearForDate(new Date('2025-04-05T12:00:00Z'));
    expect(ty.startYear).toBe(2024);
    expect(ty.label).toBe('2024-25');
  });

  it('places a mid-year date correctly', () => {
    expect(ukTaxYearForDate(new Date('2025-12-31T00:00:00Z')).startYear).toBe(
      2025
    );
    expect(ukTaxYearForDate(new Date('2025-01-15T00:00:00Z')).startYear).toBe(
      2024
    );
  });

  it('parses labels and bare start years', () => {
    expect(parseUKTaxYearLabel('2025-26')?.startYear).toBe(2025);
    expect(parseUKTaxYearLabel('2025')?.startYear).toBe(2025);
    expect(parseUKTaxYearLabel('nonsense')).toBeNull();
  });
});

describe('UK identity validators', () => {
  it('accepts a 10-digit UTR and rejects others', () => {
    expect(UTR_REGEX.test('1234567890')).toBe(true);
    expect(UTR_REGEX.test('123456789')).toBe(false); // 9 digits
    expect(UTR_REGEX.test('12345678901')).toBe(false); // 11 digits
  });

  it('accepts valid NINOs and rejects invalid prefixes/format', () => {
    expect(NINO_REGEX.test(normaliseNINO('QQ 12 34 56 C'))).toBe(false); // Q not allowed
    expect(NINO_REGEX.test(normaliseNINO('AB 12 34 56 C'))).toBe(true);
    expect(NINO_REGEX.test(normaliseNINO('BG123456C'))).toBe(false); // BG disallowed prefix
    expect(NINO_REGEX.test(normaliseNINO('AB123456E'))).toBe(false); // suffix must be A–D
  });

  it('accepts UK VAT numbers (with/without GB, 9 or 12 digits)', () => {
    expect(
      VAT_NUMBER_REGEX.test(`GB${normaliseVatNumber('GB 123456789')}`)
    ).toBe(true);
    expect(VAT_NUMBER_REGEX.test('GB123456789')).toBe(true);
    expect(VAT_NUMBER_REGEX.test('123456789012')).toBe(true); // 12-digit branch
    expect(VAT_NUMBER_REGEX.test('GB12345')).toBe(false);
  });

  it('accepts Companies House numbers (8 digits or 2 letters + 6 digits)', () => {
    expect(COMPANY_NUMBER_REGEX.test('12345678')).toBe(true);
    expect(COMPANY_NUMBER_REGEX.test('SC123456')).toBe(true);
    expect(COMPANY_NUMBER_REGEX.test('1234567')).toBe(false); // 7 chars
  });
});
