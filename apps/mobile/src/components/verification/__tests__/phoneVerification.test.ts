import {
  isPhoneVerificationError,
  normalizePhoneNumber,
  isPlausiblePhoneNumber,
} from '../phoneVerification';

/**
 * These helpers gate the phone-verification recovery flow: intercept
 * must fire on the exact 403 message POST /api/jobs throws for
 * unverified homeowners, and must NOT swallow unrelated errors into
 * the modal.
 */

describe('isPhoneVerificationError', () => {
  it('matches the exact production 403 message', () => {
    expect(
      isPhoneVerificationError(
        new Error(
          'Phone verification required. Please verify your phone number before posting jobs'
        )
      )
    ).toBe(true);
  });

  it('matches case-insensitively and on plain strings', () => {
    expect(isPhoneVerificationError('phone verification required')).toBe(true);
    expect(
      isPhoneVerificationError('Please verify your phone number first')
    ).toBe(true);
  });

  it('matches error-like objects with a message property', () => {
    expect(
      isPhoneVerificationError({ message: 'Phone verification required.' })
    ).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isPhoneVerificationError(new Error('Network request failed'))).toBe(
      false
    );
    expect(isPhoneVerificationError('Rate limit exceeded')).toBe(false);
    expect(isPhoneVerificationError(new Error('Forbidden'))).toBe(false);
  });

  it('rejects null / undefined / non-message shapes', () => {
    expect(isPhoneVerificationError(null)).toBe(false);
    expect(isPhoneVerificationError(undefined)).toBe(false);
    expect(isPhoneVerificationError(42)).toBe(false);
    expect(isPhoneVerificationError({})).toBe(false);
  });
});

describe('normalizePhoneNumber', () => {
  it('converts a UK 07 number to +44', () => {
    expect(normalizePhoneNumber('07984 596545')).toBe('+447984596545');
    expect(normalizePhoneNumber('07984596545')).toBe('+447984596545');
  });

  it('adds + to a bare 44-prefixed UK number', () => {
    expect(normalizePhoneNumber('447984596545')).toBe('+447984596545');
  });

  it('strips separators from an already-international number', () => {
    expect(normalizePhoneNumber('+44 7984-596-545')).toBe('+447984596545');
    expect(normalizePhoneNumber('+1 (555) 123 4567')).toBe('+15551234567');
  });

  it('leaves non-UK non-international input untouched apart from separators', () => {
    expect(normalizePhoneNumber('555 1234')).toBe('5551234');
  });
});

describe('isPlausiblePhoneNumber', () => {
  it('accepts UK-local and international forms', () => {
    expect(isPlausiblePhoneNumber('07984 596545')).toBe(true);
    expect(isPlausiblePhoneNumber('+44 7984 596545')).toBe(true);
    expect(isPlausiblePhoneNumber('+1 555 123 4567')).toBe(true);
  });

  it('rejects too-short, empty, and non-numeric input', () => {
    expect(isPlausiblePhoneNumber('')).toBe(false);
    expect(isPlausiblePhoneNumber('+44')).toBe(false);
    expect(isPlausiblePhoneNumber('not a phone')).toBe(false);
    // Mirrors the route's `\+[1-9]...` refine — no leading zero after +.
    expect(isPlausiblePhoneNumber('+0123456789')).toBe(false);
  });
});
