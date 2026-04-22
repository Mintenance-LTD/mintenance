// globals: true in vitest.config
import { isAllowedRedirect, safeRedirect } from '../safe-redirect';

// happy-dom provides window.location = http://localhost:3000/ by default
const ORIGIN = 'http://localhost:3000';

describe('isAllowedRedirect', () => {
  it('accepts same-origin path with an allowlisted prefix', () => {
    expect(isAllowedRedirect('/dashboard')).toBe(true);
    expect(isAllowedRedirect('/dashboard/analytics')).toBe(true);
    expect(isAllowedRedirect('/jobs/abc-123')).toBe(true);
    expect(isAllowedRedirect('/contractor/profile')).toBe(true);
    expect(isAllowedRedirect('/admin/users')).toBe(true);
  });

  it('accepts a fully-qualified URL on the same origin', () => {
    expect(isAllowedRedirect(`${ORIGIN}/dashboard`)).toBe(true);
    expect(isAllowedRedirect(`${ORIGIN}/jobs?id=42`)).toBe(true);
  });

  it('rejects null / empty / undefined', () => {
    expect(isAllowedRedirect(null)).toBe(false);
    expect(isAllowedRedirect(undefined)).toBe(false);
    expect(isAllowedRedirect('')).toBe(false);
  });

  it('rejects cross-origin absolute URLs', () => {
    expect(isAllowedRedirect('https://evil.example/phish')).toBe(false);
    expect(isAllowedRedirect('https://mintenance.evil.example/dashboard')).toBe(
      false
    );
  });

  it('SECURITY: rejects protocol-relative URLs that coerce to cross-origin', () => {
    // `new URL('//evil.example', 'http://localhost:3000')` resolves to
    // `http://evil.example` — so we must reject BEFORE URL parsing.
    expect(isAllowedRedirect('//evil.example')).toBe(false);
    expect(isAllowedRedirect('//evil.example/dashboard')).toBe(false);
  });

  it('SECURITY: rejects backslash-protocol-relative (IE/legacy quirk)', () => {
    expect(isAllowedRedirect('/\\evil.example/dashboard')).toBe(false);
  });

  it('rejects javascript: pseudo-URL', () => {
    expect(isAllowedRedirect('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URL', () => {
    expect(isAllowedRedirect('data:text/html,<script>alert(1)</script>')).toBe(
      false
    );
  });

  it('rejects same-origin paths NOT on the allowlist', () => {
    expect(isAllowedRedirect('/api/internal/dump')).toBe(false);
    expect(isAllowedRedirect('/_next/static/whatever')).toBe(false);
    expect(isAllowedRedirect('/random-path')).toBe(false);
  });

  it('rejects garbage strings that fail URL parsing', () => {
    // happy-dom's URL is permissive with base — strings it can't parse
    // as either absolute or relative still end up rejected because
    // they won't match a path prefix.
    expect(isAllowedRedirect('not a url')).toBe(false);
  });
});

describe('safeRedirect', () => {
  it('returns the URL when allowlisted', () => {
    expect(safeRedirect('/dashboard', '/fallback')).toBe('/dashboard');
  });

  it('returns the fallback when the input is cross-origin', () => {
    expect(safeRedirect('https://evil.example', '/dashboard')).toBe(
      '/dashboard'
    );
  });

  it('returns the fallback when the input is protocol-relative', () => {
    expect(safeRedirect('//evil.example/dashboard', '/dashboard')).toBe(
      '/dashboard'
    );
  });

  it('returns the fallback for null / undefined / empty', () => {
    expect(safeRedirect(null, '/dashboard')).toBe('/dashboard');
    expect(safeRedirect(undefined, '/dashboard')).toBe('/dashboard');
    expect(safeRedirect('', '/dashboard')).toBe('/dashboard');
  });
});
