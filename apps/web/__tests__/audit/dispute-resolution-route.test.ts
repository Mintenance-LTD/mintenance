// @vitest-environment node
import { NextRequest } from 'next/server';
import { ConflictError } from '@/lib/errors/api-error';
const m = vi.hoisted(() => ({
  admin: vi.fn(),
  rpc: vi.fn(),
  recover: vi.fn(),
  config: {} as Record<string, unknown>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (
    config: Record<string, unknown>,
    handler: (
      request: Request,
      context: { user: { id: string } }
    ) => Promise<Response>
  ) => {
    m.config = config;
    return (request: Request) => handler(request, { user: { id: 'admin' } });
  },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: m.admin,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: m.rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: 'escrow', payee_id: 'contractor' },
            error: null,
          }),
        }),
      }),
    }),
  },
}));
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: {
    resolveContractorTier: async () => 'basic',
    calculateFees: () => ({ platformFeeRate: 0.1 }),
  },
}));
vi.mock('@/lib/services/payment/DisputeSettlementService', () => ({
  readDisputeResolution: (x: unknown) => x,
  recoverDisputeSettlement: m.recover,
}));
import { POST } from '@/app/api/admin/disputes/resolve/route';
const payload = {
  escrowId: 'fc160906-0000-4000-8000-000000000020',
  decision: 'split_50_50',
  reason: 'Synthetic decision',
};
const send = () =>
  POST(
    new NextRequest('http://localhost/api/admin/disputes/resolve', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({}) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.admin.mockResolvedValue(undefined);
  m.rpc.mockResolvedValue({
    data: {
      id: 'resolution',
      escrow_id: payload.escrowId,
      decision: payload.decision,
      reason: payload.reason,
    },
    error: null,
  });
});
it('requires admin role, fresh MFA and default CSRF protection at the wrapper', () => {
  expect(m.config.roles).toEqual(['admin']);
  expect(m.config.requireMfaVerifiedWithinMinutes).toBe(15);
  expect(m.config.csrf).not.toBe(false);
});
it('checks current database administrator authority before reservation', async () => {
  m.admin.mockRejectedValue(new Error('Administrator revoked'));
  await expect(send()).rejects.toThrow('Administrator revoked');
  expect(m.rpc).not.toHaveBeenCalled();
  expect(m.recover).not.toHaveBeenCalled();
});
it.each([
  ['completed', 200, true],
  ['processing', 202, false],
  ['requires_intervention', 409, false],
])('reports %s without false success', async (status, code, success) => {
  m.recover.mockResolvedValue({ status, resolutionId: 'resolution' });
  const response = await send();
  expect(response.status).toBe(code);
  expect(await response.json()).toMatchObject({ success, status });
});
it('returns pending after uncertain settlement failure instead of reporting resolution', async () => {
  m.recover.mockRejectedValue(
    new Error('Provider succeeded but database unavailable')
  );
  const response = await send();
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({
    success: false,
    status: 'processing',
    resolutionId: 'resolution',
  });
});
it('reports a revoked authorization or invariant conflict as requiring intervention', async () => {
  m.recover.mockRejectedValue(
    new ConflictError('Current administrator required')
  );
  const response = await send();
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    success: false,
    status: 'requires_intervention',
  });
});
