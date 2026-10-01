// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  bearer: vi.fn(),
  csrf: vi.fn(),
  admin: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.cookie,
  getCurrentUserFromBearerToken: mocks.bearer,
}));
vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.csrf }));
vi.mock('@/lib/admin-verification', () => ({
  verifyAdminRoleFromDatabase: mocks.admin,
}));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.limit },
}));
vi.mock('@/lib/services/building-surveyor/ABTestMonitoringService', () => ({
  ABTestMonitoringService: {},
}));
vi.mock('@/lib/services/building-surveyor/ABTestAlertingService', () => ({
  ABTestAlertingService: {},
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: {} }));
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError } from '@/lib/errors/api-error';
import { GET as dashboard } from '@/app/api/building-surveyor/ab-test-dashboard/route';
const cookieUser = {
  id: 'cookie-user',
  email: 'cookie@example.test',
  role: 'homeowner' as const,
  first_name: '',
  last_name: '',
};
const tokenUser = { ...cookieUser, id: 'token-user' };
const context = { params: Promise.resolve({}) };
const request = (method = 'POST', bearer?: string) =>
  new NextRequest('http://localhost/api/example', {
    method,
    headers: bearer === undefined ? {} : { authorization: `Bearer ${bearer}` },
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie.mockResolvedValue(cookieUser);
  mocks.bearer.mockResolvedValue(tokenUser);
  mocks.csrf.mockResolvedValue(undefined);
  mocks.admin.mockResolvedValue(true);
  mocks.limit.mockResolvedValue({ allowed: true });
});
it('keeps CSRF protection for cookie mutations', async () => {
  mocks.csrf.mockRejectedValue(new ForbiddenError('Missing CSRF'));
  const handler = vi.fn(async () => NextResponse.json({ ok: true }));
  const response = await withApiHandler({ rateLimit: false }, handler)(
    request(),
    context
  );
  expect(response.status).toBe(403);
  expect(handler).not.toHaveBeenCalled();
});
it('selects the verified bearer identity when both credentials are present', async () => {
  const handler = vi.fn(async (_req, { user }) =>
    NextResponse.json({ id: user.id })
  );
  const response = await withApiHandler({ rateLimit: false }, handler)(
    request('POST', 'valid'),
    context
  );
  expect(await response.json()).toEqual({ id: 'token-user' });
  expect(mocks.cookie).not.toHaveBeenCalled();
  expect(mocks.csrf).not.toHaveBeenCalled();
});
it('rejects an invalid bearer without falling back to a valid cookie', async () => {
  mocks.bearer.mockResolvedValue(null);
  const handler = vi.fn(async () => NextResponse.json({ ok: true }));
  const response = await withApiHandler({ rateLimit: false }, handler)(
    request('POST', 'invalid'),
    context
  );
  expect(response.status).toBe(401);
  expect(mocks.cookie).not.toHaveBeenCalled();
  expect(handler).not.toHaveBeenCalled();
});
it('does not grant a public mutation a CSRF exemption for an unverified header', async () => {
  mocks.bearer.mockResolvedValue(null);
  const handler = vi.fn(async () => NextResponse.json({ ok: true }));
  const response = await withApiHandler(
    { auth: false, rateLimit: false },
    handler
  )(request('POST', 'invalid'), context);
  expect(response.status).toBe(401);
  expect(handler).not.toHaveBeenCalled();
});
it('honours explicit CSRF requirements even with a valid bearer', async () => {
  await withApiHandler({ csrf: true, rateLimit: false }, async () =>
    NextResponse.json({ ok: true })
  )(request('POST', 'valid'), context);
  expect(mocks.csrf).toHaveBeenCalledTimes(1);
});
it('preserves explicitly public signature-authenticated routes', async () => {
  const response = await withApiHandler(
    { auth: false, csrf: false, rateLimit: false },
    async () => NextResponse.json({ ok: true })
  )(request('POST', 'provider-secret'), context);
  expect(response.status).toBe(200);
  expect(mocks.bearer).not.toHaveBeenCalled();
});
it.each(['homeowner', 'contractor'])(
  'denies %s access to AI monitoring before querying data',
  async (role) => {
    mocks.cookie.mockResolvedValue({ ...cookieUser, role });
    expect((await dashboard(request('GET'), context)).status).toBe(403);
  }
);
it('rejects an admin whose database role has been revoked', async () => {
  mocks.cookie.mockResolvedValue({ ...cookieUser, role: 'admin' });
  mocks.admin.mockResolvedValue(false);
  expect((await dashboard(request('GET'), context)).status).toBe(403);
  expect(mocks.admin).toHaveBeenCalledWith(cookieUser.id);
});
it('denies anonymous AI monitoring access', async () => {
  mocks.cookie.mockResolvedValue(null);
  expect((await dashboard(request('GET'), context)).status).toBe(401);
});
