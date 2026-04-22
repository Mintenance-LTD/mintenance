// globals: true in vitest.config
import { sanitizeIlikePattern } from '../sanitize-postgrest';

describe('sanitizeIlikePattern', () => {
  it('strips PostgREST filter operators', () => {
    expect(sanitizeIlikePattern('foo,status.eq.paid')).toBe('foostatuseqpaid');
    expect(sanitizeIlikePattern('a.b.c')).toBe('abc');
  });

  it('strips LIKE wildcards to prevent broad scans', () => {
    expect(sanitizeIlikePattern('%%%%%')).toBe('');
    expect(sanitizeIlikePattern('_foo_')).toBe('foo');
  });

  it('preserves alphanumerics, spaces, hyphens, apostrophes', () => {
    expect(sanitizeIlikePattern("o'brien - plumber 42")).toBe(
      "o'brien - plumber 42"
    );
  });

  it('caps length at the default 80 chars', () => {
    const s = 'a'.repeat(200);
    expect(sanitizeIlikePattern(s)).toHaveLength(80);
  });

  it('honors custom maxLen', () => {
    expect(sanitizeIlikePattern('a'.repeat(50), 10)).toHaveLength(10);
  });

  it('trims leading/trailing whitespace after filtering', () => {
    expect(sanitizeIlikePattern('   foo,bar   ')).toBe('foobar');
  });

  it('returns empty string for non-string input', () => {
    // @ts-expect-error runtime-only guard
    expect(sanitizeIlikePattern(null)).toBe('');
    // @ts-expect-error runtime-only guard
    expect(sanitizeIlikePattern(undefined)).toBe('');
    // @ts-expect-error runtime-only guard
    expect(sanitizeIlikePattern(42)).toBe('');
  });

  it('rejects parentheses and operator chars used in PostgREST DSL', () => {
    expect(sanitizeIlikePattern('foo)or(bar')).toBe('fooorbar');
    expect(sanitizeIlikePattern('a&b|c')).toBe('abc');
  });
});
