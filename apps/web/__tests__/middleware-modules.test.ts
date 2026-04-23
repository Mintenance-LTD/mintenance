/**
 * Smoke tests for middleware helper modules extracted from middleware.ts.
 *
 * These verify the pure functions that classify routes, build CSP headers,
 * and handle format-only gates. The main middleware() function is not tested
 * here (it's a stateful integration that needs e2e coverage).
 */
import { describe, it, expect } from 'vitest';
import { isPublicRoute } from '../middleware/public-routes';
import {
  buildPublicCSP,
  buildAuthenticatedCSP,
  buildStrictReportOnlyCSP,
} from '../middleware/csp';
import { isValidJwtFormat, extractBearerToken } from '../middleware/helpers';
import { NextRequest } from 'next/server';

describe('isPublicRoute', () => {
  it('returns true for the root path', () => {
    expect(isPublicRoute('/')).toBe(true);
  });

  it('returns true for exact public page routes', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/register')).toBe(true);
    expect(isPublicRoute('/about')).toBe(true);
    expect(isPublicRoute('/pricing')).toBe(true);
  });

  it('returns true for nested public page paths', () => {
    expect(isPublicRoute('/blog/my-post')).toBe(true);
    expect(isPublicRoute('/faq/billing')).toBe(true);
  });

  it('returns true for exact public API routes', () => {
    expect(isPublicRoute('/api/csrf')).toBe(true);
    expect(isPublicRoute('/api/diag')).toBe(true);
    expect(isPublicRoute('/api/csp-report')).toBe(true);
  });

  it('does NOT match sub-paths of exact public API routes', () => {
    expect(isPublicRoute('/api/diag/internals')).toBe(false);
    expect(isPublicRoute('/api/csrf/rotate')).toBe(false);
  });

  it('returns true for /api/auth/* sub-paths (prefix match)', () => {
    expect(isPublicRoute('/api/auth/login')).toBe(true);
    expect(isPublicRoute('/api/auth/login/callback')).toBe(true);
  });

  it('returns true for UUID-formatted contractor profile paths', () => {
    expect(
      isPublicRoute('/contractor/12345678-1234-1234-1234-123456789012')
    ).toBe(true);
  });

  it('SECURITY: blocks non-UUID /contractor/* paths from being public', () => {
    expect(isPublicRoute('/contractor/settings')).toBe(false);
    expect(isPublicRoute('/contractor/dashboard-enhanced')).toBe(false);
    expect(isPublicRoute('/contractor/edit')).toBe(false);
  });

  it('returns true for admin auth routes (exact match only)', () => {
    expect(isPublicRoute('/admin/login')).toBe(true);
    expect(isPublicRoute('/admin/register')).toBe(true);
    expect(isPublicRoute('/admin/forgot-password')).toBe(true);
  });

  it('blocks other /admin/* paths from being public', () => {
    expect(isPublicRoute('/admin/users')).toBe(false);
    expect(isPublicRoute('/admin/dashboard')).toBe(false);
    expect(isPublicRoute('/admin/login/callback')).toBe(false);
  });

  it('returns false for authenticated routes', () => {
    expect(isPublicRoute('/dashboard')).toBe(false);
    expect(isPublicRoute('/jobs/create')).toBe(false);
    expect(isPublicRoute('/api/jobs/abc-123')).toBe(false);
    expect(isPublicRoute('/settings')).toBe(false);
  });
});

describe('CSP builders', () => {
  it('public CSP contains required Stripe + Maps origins', () => {
    const csp = buildPublicCSP();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://js.stripe.com');
    expect(csp).toContain('https://maps.googleapis.com');
    expect(csp).toContain('https://*.supabase.co');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('authenticated CSP includes localhost connect-src in dev only', () => {
    const dev = buildAuthenticatedCSP(true);
    const prod = buildAuthenticatedCSP(false);
    expect(dev).toContain('localhost');
    expect(prod).not.toContain('localhost');
    expect(prod).toContain('https://vercel.live');
  });

  it('strict report-only CSP includes report-uri and drops vercel.live from script-src', () => {
    const csp = buildStrictReportOnlyCSP(false);
    expect(csp).toContain('report-uri /api/csp-report');
    // script-src should not include vercel.live in strict mode
    const scriptSrcLine = csp
      .split(';')
      .find((line) => line.trim().startsWith('script-src'));
    expect(scriptSrcLine).not.toContain('vercel.live');
  });

  it('all CSPs block inline plugins and clickjacking', () => {
    for (const csp of [
      buildPublicCSP(),
      buildAuthenticatedCSP(true),
      buildAuthenticatedCSP(false),
      buildStrictReportOnlyCSP(false),
    ]) {
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    }
  });

  it('allows Sentry ingest endpoints in connect-src', () => {
    // Regression guard (2026-04-22): without these allowances the
    // browser silently blocks every Sentry envelope POST and we lose
    // client-side error telemetry.
    for (const csp of [
      buildPublicCSP(),
      buildAuthenticatedCSP(true),
      buildAuthenticatedCSP(false),
      buildStrictReportOnlyCSP(false),
    ]) {
      expect(csp).toContain('*.ingest.sentry.io');
      expect(csp).toContain('*.ingest.de.sentry.io');
      expect(csp).toContain('*.ingest.us.sentry.io');
    }
  });

  it('sets worker-src with blob: so Vercel Live + bundler workers boot', () => {
    // Regression guard: without worker-src, browsers fall back to
    // script-src which has no blob: allowance and blocks worker
    // creation.
    for (const csp of [
      buildPublicCSP(),
      buildAuthenticatedCSP(true),
      buildAuthenticatedCSP(false),
      buildStrictReportOnlyCSP(false),
    ]) {
      expect(csp).toContain("worker-src 'self' blob:");
    }
  });
});

describe('JWT format check', () => {
  it('accepts a well-formed JWT (3 base64url parts)', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature-part-here';
    expect(isValidJwtFormat(token)).toBe(true);
  });

  it('rejects malformed tokens', () => {
    expect(isValidJwtFormat('invalid')).toBe(false);
    expect(isValidJwtFormat('only.two')).toBe(false);
    expect(isValidJwtFormat('')).toBe(false);
    expect(isValidJwtFormat(null)).toBe(false);
    expect(isValidJwtFormat(undefined)).toBe(false);
  });

  it('rejects tokens with invalid characters', () => {
    expect(isValidJwtFormat('part.with spaces.signature')).toBe(false);
    expect(isValidJwtFormat('part.with!special.chars')).toBe(false);
  });

  it('rejects tokens with 4+ parts', () => {
    expect(isValidJwtFormat('a.b.c.d')).toBe(false);
  });
});

describe('extractBearerToken', () => {
  function makeRequest(authHeader: string | null): NextRequest {
    const headers = new Headers();
    if (authHeader !== null) headers.set('authorization', authHeader);
    return new Request('http://localhost/api/test', {
      headers,
    }) as unknown as NextRequest;
  }

  it('extracts token from Bearer header', () => {
    const req = makeRequest('Bearer abc.def.ghi');
    expect(extractBearerToken(req)).toBe('abc.def.ghi');
  });

  it('returns null when header is missing', () => {
    const req = makeRequest(null);
    expect(extractBearerToken(req)).toBeNull();
  });

  it('returns null when header is empty after Bearer prefix', () => {
    const req = makeRequest('Bearer ');
    expect(extractBearerToken(req)).toBeNull();
  });
});
