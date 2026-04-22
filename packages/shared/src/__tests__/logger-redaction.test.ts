// Explicit vitest imports — packages/shared has no globals-enabled config.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Logger } from '../logger';

/**
 * These tests target the 2026-04-21 redaction-broadening patch: the
 * `sanitizeObject` must redact a wider set of sensitive keys AND scrub
 * credit-card / JWT patterns inside string values. Redaction runs ONLY
 * in non-development NODE_ENV, so we toggle it for the test.
 */

const originalEnv = process.env.NODE_ENV;

beforeAll(() => {
  process.env.NODE_ENV = 'production';
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

function capture(fn: () => void): string {
  const warns: string[] = [];
  const spy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
    warns.push(args.map(String).join(' '));
  });
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  return warns.join('\n');
}

describe('logger redaction — broadened key set (2026-04-21)', () => {
  it.each([
    'password',
    'Password',
    'userPassword',
    'passwd',
    'pwd',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'idToken',
    'id_token',
    'authorization',
    'Authorization',
    'cookie',
    'set-cookie',
    'setCookie',
    'apiKey',
    'api_key',
    'clientSecret',
    'client_secret',
    'totpSecret',
    'totp_secret',
    'backupCode',
    'backup_code',
    'cvv',
    'cvc',
    'pan',
    'ssn',
    'taxId',
    'national_insurance',
    'stripe_account_id',
    'stripe_customer_id',
    'stripe_client_secret',
    'authTag',
    'auth_tag',
    'iv',
    'jwt',
    'bearer',
  ])('redacts sensitive key `%s`', (key) => {
    const logger = new Logger();
    const output = capture(() =>
      logger.warn('test', { [key]: 'super-secret-value' })
    );
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('super-secret-value');
  });

  it('redacts any key whose name contains "password" (substring match)', () => {
    const logger = new Logger();
    const output = capture(() =>
      logger.warn('test', { oldPasswordHash: 'bcrypt$$secret' })
    );
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('bcrypt$$secret');
  });

  it('redacts nested sensitive keys', () => {
    const logger = new Logger();
    const output = capture(() =>
      logger.warn('test', {
        user: { id: 'u1', authorization: 'Bearer abc' },
      })
    );
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('Bearer abc');
  });

  it('leaves non-sensitive keys alone', () => {
    const logger = new Logger();
    const output = capture(() =>
      logger.warn('test', { userId: 'u1', jobId: 'j1' })
    );
    expect(output).toContain('u1');
    expect(output).toContain('j1');
  });
});

describe('logger redaction — string-value scrubbing', () => {
  it('scrubs credit-card-shaped digits inside free-form strings', () => {
    const logger = new Logger();
    const output = capture(() =>
      logger.warn('test', {
        notes: 'Receipt shows 4242 4242 4242 4242 charged.',
      })
    );
    expect(output).toContain('[REDACTED_CC]');
    expect(output).not.toContain('4242 4242 4242 4242');
  });

  it('scrubs card numbers with hyphen separators', () => {
    const logger = new Logger();
    const output = capture(() =>
      logger.warn('test', { raw: '5555-5555-5555-4444' })
    );
    expect(output).toContain('[REDACTED_CC]');
    expect(output).not.toContain('5555-5555-5555-4444');
  });

  it('scrubs JWT-shaped strings inside free-form values', () => {
    const logger = new Logger();
    // 3 base64url segments, >=10 chars each.
    const fakeJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0' +
      '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const output = capture(() =>
      logger.warn('test', {
        breadcrumb: `Received response: ${fakeJwt} — proceeding.`,
      })
    );
    expect(output).toContain('[REDACTED_JWT]');
    expect(output).not.toContain(fakeJwt);
  });

  it('scrubs values inside arrays', () => {
    const logger = new Logger();
    const output = capture(() =>
      logger.warn('test', {
        history: ['ok', '4242 4242 4242 4242', 'done'],
      })
    );
    expect(output).toContain('[REDACTED_CC]');
    expect(output).not.toContain('4242 4242 4242 4242');
  });
});
