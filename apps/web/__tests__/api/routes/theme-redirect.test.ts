// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly.

/**
 * Open-redirect regression tests for GET /api/theme.
 * Route: apps/web/app/api/theme/route.ts
 *
 * The route is public (auth:false, csrf:false) and 302s to the `redirect`
 * query param. Before the 2026-07-06 audit fix (#9) the guard was a bare
 * `startsWith('/')`, which accepts protocol-relative `//evil.com` and the
 * backslash variant `/\evil.com` — both resolve to an external origin
 * (CWE-601). These tests pin that only clean internal paths are honoured and
 * everything else falls back to /dashboard.
 *
 * withApiHandler is mocked to a passthrough (the route sets auth:false anyway);
 * next/headers cookies() is stubbed so the handler can set the theme cookie.
 */

const mocks = vi.hoisted(() => ({
  cookieSet: vi.fn(),
}));

vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_config: unknown, handler: (req: unknown) => unknown) => (req: unknown) =>
      handler(req),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: mocks.cookieSet }),
}));

import { GET } from '@/app/api/theme/route';
import { NextRequest } from 'next/server';

async function locationFor(redirect: string | null): Promise<string> {
  const url = new URL('http://localhost:3000/api/theme');
  url.searchParams.set('value', 'mint-editorial');
  if (redirect !== null) url.searchParams.set('redirect', redirect);
  const res = await GET(new NextRequest(url) as never);
  // NextResponse.redirect → 307/302 with a Location header (absolute URL).
  return new URL(res.headers.get('location') as string).href;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/theme — open-redirect guard', () => {
  it('honours a clean internal path', async () => {
    expect(await locationFor('/jobs/123')).toBe(
      'http://localhost:3000/jobs/123'
    );
  });

  it('defaults to /dashboard when no redirect is supplied', async () => {
    expect(await locationFor(null)).toBe('http://localhost:3000/dashboard');
  });

  it('blocks protocol-relative //evil.com', async () => {
    expect(await locationFor('//evil.com')).toBe(
      'http://localhost:3000/dashboard'
    );
  });

  it('blocks the backslash variant /\\evil.com', async () => {
    expect(await locationFor('/\\evil.com')).toBe(
      'http://localhost:3000/dashboard'
    );
  });

  it('blocks an absolute external URL', async () => {
    expect(await locationFor('https://evil.com')).toBe(
      'http://localhost:3000/dashboard'
    );
  });
});
