// @vitest-environment node
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  csrf: vi.fn(),
  admin: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: m.auth,
  getCurrentUserFromBearerToken: async () => null,
}));
vi.mock('@/lib/csrf', () => ({ requireCSRF: m.csrf }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: async () => ({ allowed: true }) },
}));
vi.mock('@/lib/admin-verification', () => ({
  verifyAdminRoleFromDatabase: m.admin,
  requireAdminFromDatabase: m.admin,
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: {},
}));
vi.mock('@/lib/services/payment/DisputeSettlementService', () => ({
  readDisputeResolution: vi.fn(),
  recoverDisputeSettlement: vi.fn(),
}));
vi.mock('@/lib/cors', () => ({ getCorsHeaders: () => ({}) }));
import { buildStepUpCookieValue } from '@/lib/auth/mfa-step-up';
import { ForbiddenError } from '@/lib/errors/api-error';
import { POST } from '@/app/api/disputes/[id]/mediation/route';
const send = (cookie?: string) =>
  POST(
    new NextRequest('http://localhost/api/admin/disputes/resolve', {
      method: 'POST',
      headers: cookie ? { cookie: `mfa-stepup=${cookie}` } : {},
      body: JSON.stringify({
        action: 'schedule',
        scheduledAt: '2026-12-01T12:00:00Z',
        mediatorId: 'fa220922-0000-4000-8000-000000000001',
      }),
    }),
    { params: Promise.resolve({ id: 'fa220922-0000-4000-8000-000000000020' }) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('MFA_STEP_UP_SECRET', 'synthetic-test-only-secret-for-step-up');
  m.auth.mockResolvedValue({ id: 'admin', role: 'admin' });
  m.admin.mockResolvedValue(true);
  m.csrf.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it('rejects unauthenticated requests before payment reservation', async () => {
  m.auth.mockResolvedValue(null);
  expect((await send()).status).toBe(401);
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each(['homeowner', 'contractor'])(
  'rejects %s even with a signed step-up cookie',
  async (role) => {
    m.auth.mockResolvedValue({ id: 'admin', role });
    expect((await send(buildStepUpCookieValue('admin'))).status).toBe(403);
    expect(m.rpc).not.toHaveBeenCalled();
  }
);
it('rejects a revoked database administrator', async () => {
  m.admin.mockRejectedValue(new ForbiddenError('Administrator access revoked'));
  expect((await send(buildStepUpCookieValue('admin'))).status).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each(['missing', 'wrong-user', 'expired'])(
  'rejects %s step-up proof',
  async (kind) => {
    const now = Date.now();
    const cookie =
      kind === 'missing'
        ? undefined
        : buildStepUpCookieValue(
            kind === 'wrong-user' ? 'other-admin' : 'admin'
          );
    if (kind === 'expired')
      vi.spyOn(Date, 'now').mockReturnValue(now + 16 * 60_000);
    const response = await send(cookie);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ requiresStepUp: true });
    expect(m.rpc).not.toHaveBeenCalled();
  }
);
it('enforces the CSRF rejection before running the handler', async () => {
  m.csrf.mockRejectedValue(new ForbiddenError('Invalid CSRF proof'));
  expect((await send(buildStepUpCookieValue('admin'))).status).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it('allows a current admin with fresh signed proof to schedule mediation', async () => {
  m.rpc.mockResolvedValue({
    data: {
      escrowId: 'fa220922-0000-4000-8000-000000000020',
      status: 'scheduled',
      requestedAt: '2026-09-22T12:00:00Z',
      scheduledAt: '2026-12-01T12:00:00Z',
      completedAt: null,
    },
    error: null,
  });
  expect((await send(buildStepUpCookieValue('admin'))).status).toBe(200);
  expect(m.csrf).toHaveBeenCalledOnce();
  expect(m.admin).toHaveBeenCalledWith('admin');
});
