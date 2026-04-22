// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Trusted client-IP extraction.
 *
 * Focus: prove the helper REFUSES to return the first entry of
 * `x-forwarded-for` (the spoofable one). Previous behavior across 29
 * call sites used `.split(',')[0]`, which any remote caller could
 * override by sending their own `X-Forwarded-For: 1.2.3.4, <real-ip>`
 * header and bypass per-IP rate limits + whitelist checks.
 */

import { getClientIp } from '../request-ip';

function makeRequest(headers: Record<string, string | undefined>) {
  return {
    headers: {
      get(name: string): string | null {
        const v = headers[name.toLowerCase()];
        return v === undefined ? null : v;
      },
    },
  };
}

describe('getClientIp', () => {
  it('returns the LAST entry of x-forwarded-for, never the first', () => {
    const req = makeRequest({
      'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12',
    });
    expect(getClientIp(req)).toBe('9.10.11.12');
    expect(getClientIp(req)).not.toBe('1.2.3.4');
  });

  it('SECURITY: refuses a spoofed first XFF entry', () => {
    // Attacker sends: X-Forwarded-For: 1.2.3.4
    // Vercel appends the real observed IP: 1.2.3.4, <real-ip>
    const req = makeRequest({
      'x-forwarded-for': '1.2.3.4, 203.0.113.99',
    });
    // Must return the real IP, not the attacker-supplied prefix.
    expect(getClientIp(req)).toBe('203.0.113.99');
  });

  it('prefers x-vercel-forwarded-for over x-forwarded-for', () => {
    const req = makeRequest({
      'x-vercel-forwarded-for': '203.0.113.99',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(getClientIp(req)).toBe('203.0.113.99');
  });

  it('uses first entry of x-vercel-forwarded-for when it has multiple', () => {
    // Vercel's leftmost IS the validated client IP (unlike raw XFF).
    const req = makeRequest({
      'x-vercel-forwarded-for': '203.0.113.99, 10.0.0.1',
    });
    expect(getClientIp(req)).toBe('203.0.113.99');
  });

  it('falls back to cf-connecting-ip when vercel/xff missing', () => {
    const req = makeRequest({
      'cf-connecting-ip': '198.51.100.1',
    });
    expect(getClientIp(req)).toBe('198.51.100.1');
  });

  it('cf-connecting-ip trumps x-forwarded-for when both present', () => {
    const req = makeRequest({
      'cf-connecting-ip': '198.51.100.1',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(getClientIp(req)).toBe('198.51.100.1');
  });

  it('handles a single-entry x-forwarded-for', () => {
    const req = makeRequest({ 'x-forwarded-for': '203.0.113.99' });
    expect(getClientIp(req)).toBe('203.0.113.99');
  });

  it('trims whitespace inside x-forwarded-for entries', () => {
    const req = makeRequest({
      'x-forwarded-for': '  1.2.3.4 ,   203.0.113.99   ',
    });
    expect(getClientIp(req)).toBe('203.0.113.99');
  });

  it('falls back to x-real-ip last', () => {
    const req = makeRequest({ 'x-real-ip': '203.0.113.99' });
    expect(getClientIp(req)).toBe('203.0.113.99');
  });

  it('returns "unknown" when no proxy headers are present', () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe('unknown');
  });

  it('returns "unknown" when all proxy headers are empty strings', () => {
    const req = makeRequest({
      'x-forwarded-for': '',
      'x-real-ip': '',
      'x-vercel-forwarded-for': '',
      'cf-connecting-ip': '',
    });
    expect(getClientIp(req)).toBe('unknown');
  });

  it('returns "unknown" when x-forwarded-for is only whitespace/commas', () => {
    const req = makeRequest({ 'x-forwarded-for': ' , , ,  ' });
    expect(getClientIp(req)).toBe('unknown');
  });

  it('returns "unknown" when null-returning headers.get is simulated', () => {
    const req = {
      headers: { get: () => null },
    };
    expect(getClientIp(req)).toBe('unknown');
  });
});
