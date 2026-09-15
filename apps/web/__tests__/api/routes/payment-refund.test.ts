/** Route boundary tests; accounting/provider recovery is tested in the real service and isolated SQL diagnostics. */
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  jobUpdate: vi.fn(),
  escrowUpdate: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  checkApiRateLimit: vi.fn(),
  getIdempotencyKeyFromRequest: vi.fn(),
  checkIdempotency: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  validateRequest: vi.fn(),
  stripeRefundsCreate: vi.fn(),
  context: vi.fn(),
  reserve: vi.fn(),
  recover: vi.fn(),
  requiresMFA: vi.fn(),
  validateMFAForPayment: vi.fn(),
  detectAnomalies: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
  },
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
  checkApiRateLimit: mocks.checkApiRateLimit,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: mocks.getIdempotencyKeyFromRequest,
  // Deterministic variant (audit 2026-07-27) — same mock so existing
  // mockReturnValue setups drive both entry points.
  getDeterministicIdempotencyKeyFromRequest: mocks.getIdempotencyKeyFromRequest,
  checkIdempotency: mocks.checkIdempotency,
  storeIdempotencyResult: mocks.storeIdempotencyResult,
  releaseIdempotencyClaim: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
}));

vi.mock('@/lib/validation/schemas', () => ({
  refundRequestSchema: { _mock: true },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
      create: mocks.stripeRefundsCreate,
    },
  },
}));

// Mock dynamic imports used in the route
vi.mock('@/lib/payments/high-risk-checks', () => ({
  requiresMFA: mocks.requiresMFA,
  validateMFAForPayment: mocks.validateMFAForPayment,
  HighRiskOperation: { REFUND: 'REFUND' },
}));

vi.mock('@/lib/monitoring/payment-monitor', () => ({
  PaymentMonitoringService: {
    detectAnomalies: mocks.detectAnomalies,
  },
}));

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

vi.mock('@/lib/services/payment/RefundService', () => ({
  readRefundContext: mocks.context,
  reserveRefund: mocks.reserve,
  recoverRefund: mocks.recover,
}));
import { ConflictError, ForbiddenError } from '@/lib/errors/api-error';
import { POST } from '@/app/api/payments/refund/route';

let job: Record<string, unknown> | null;
let escrow: Record<string, unknown> | null;
const user = {
  id: 'homeowner-1',
  role: 'homeowner',
  email: 'synthetic@example.invalid',
};
const input = {
  jobId: 'job-1',
  escrowTransactionId: 'escrow-1',
  amount: 250,
  reason: 'Job cancelled',
};
const operation = {
  id: 'operation-1',
  escrow_id: 'escrow-1',
  actor_id: 'homeowner-1',
  gross_minor: 25000,
  cash_minor: 25000,
  credit_minor: 0,
  state: 'reserved',
  provider_refund_id: null,
};
function request(mfa?: string) {
  return new NextRequest('http://localhost:3000/api/payments/refund', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(mfa ? { 'x-mfa-token': mfa } : {}),
    },
    body: JSON.stringify(input),
  });
}
const run = (mfa?: string) =>
  POST(request(mfa), { params: Promise.resolve({}) });
beforeEach(() => {
  vi.resetAllMocks();
  job = {
    id: 'job-1',
    homeowner_id: user.id,
    contractor_id: 'contractor-1',
    status: 'cancelled',
  };
  escrow = {
    id: 'escrow-1',
    job_id: 'job-1',
    payer_id: user.id,
    amount: 250,
    status: 'held',
    payment_intent_id: 'pi_synthetic',
  };
  mocks.getCurrentUserFromCookies.mockResolvedValue(user);
  mocks.checkApiRateLimit.mockResolvedValue({ allowed: true });
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.getIdempotencyKeyFromRequest.mockReturnValue('client-key');
  mocks.validateRequest.mockResolvedValue({ data: input });
  mocks.requiresMFA.mockResolvedValue({ required: false });
  mocks.detectAnomalies.mockResolvedValue({ riskScore: 0, blockedReasons: [] });
  mocks.context.mockResolvedValue({ existing: null, remainingMinor: 25000 });
  mocks.reserve.mockImplementation(async (params) => ({
    ...operation,
    actor_id: params.actorId,
    gross_minor: params.grossMinor,
    cash_minor: params.grossMinor,
  }));
  mocks.recover.mockImplementation(async (op) => ({
    ...op,
    state: 'succeeded',
    provider_refund_id: 'refund-1',
  }));
  mocks.supabaseFrom.mockImplementation((table) => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      update: table === 'jobs' ? mocks.jobUpdate : mocks.escrowUpdate,
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.single.mockResolvedValue({
      data: table === 'jobs' ? job : escrow,
      error: null,
    });
    return chain;
  });
});

describe('refund route authority and validation', () => {
  it('requires authentication', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);
    expect((await run()).status).toBe(401);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it.each(['contractor', 'admin'])(
    'rejects %s role at the framework boundary',
    async (role) => {
      mocks.getCurrentUserFromCookies.mockResolvedValue({ ...user, role });
      expect((await run()).status).toBe(403);
      expect(mocks.context).not.toHaveBeenCalled();
    }
  );
  it('enforces CSRF before financial work', async () => {
    mocks.requireCSRF.mockRejectedValue(new ForbiddenError('CSRF rejected'));
    expect((await run()).status).toBe(403);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('rate limits requests', async () => {
    mocks.checkApiRateLimit.mockResolvedValue({ allowed: false });
    expect((await run()).status).toBe(429);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('returns schema validation failures without reading financial records', async () => {
    const { NextResponse } = await import('next/server');
    mocks.validateRequest.mockResolvedValue(
      NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    );
    expect((await run()).status).toBe(400);
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
  });
  it.each(['job', 'escrow'])('requires an existing %s', async (kind) => {
    if (kind === 'job') job = null;
    else escrow = null;
    expect((await run()).status).toBe(404);
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it('rejects the former payer before reading durable refund results', async () => {
    job!.payer_user_id = 'another-payer';
    expect((await run()).status).toBe(403);
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it('also requires the escrow funding payer', async () => {
    escrow!.payer_id = 'former-payer';
    expect((await run()).status).toBe(403);
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it('accepts the designated payer rather than assuming the homeowner pays', async () => {
    job!.payer_user_id = 'payer-2';
    escrow!.payer_id = 'payer-2';
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      ...user,
      id: 'payer-2',
    });
    expect((await run()).status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'payer-2' })
    );
  });
  it.each(['completed', 'in_progress', 'assigned'])(
    'rejects new refund for %s job',
    async (status) => {
      job!.status = status;
      expect((await run()).status).toBe(400);
      expect(mocks.reserve).not.toHaveBeenCalled();
    }
  );
  it.each(['released', 'refunded', 'release_pending'])(
    'rejects unowned %s escrow operation',
    async (status) => {
      escrow!.status = status;
      expect((await run()).status).toBe(400);
      expect(mocks.reserve).not.toHaveBeenCalled();
    }
  );
  it('requires a provider payment identity', async () => {
    escrow!.payment_intent_id = null;
    expect((await run()).status).toBe(400);
  });
  it.each([0, -1, 251, NaN])(
    'rejects invalid/excess amount %s instead of silently refunding a different amount',
    async (amount) => {
      mocks.validateRequest.mockResolvedValue({ data: { ...input, amount } });
      expect((await run()).status).toBe(400);
      expect(mocks.reserve).not.toHaveBeenCalled();
    }
  );
  it('uses remaining principal for an omitted amount', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: { ...input, amount: undefined },
    });
    mocks.context.mockResolvedValue({ existing: null, remainingMinor: 10000 });
    expect((await run()).status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ grossMinor: 10000 })
    );
  });
});

describe('refund security and durable recovery', () => {
  it('requires MFA when risk rules require it', async () => {
    mocks.requiresMFA.mockResolvedValue({ required: true });
    expect((await run()).status).toBe(403);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('rejects invalid MFA', async () => {
    mocks.requiresMFA.mockResolvedValue({ required: true });
    mocks.validateMFAForPayment.mockResolvedValue({ valid: false });
    expect((await run('invalid')).status).toBe(403);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('accepts validated MFA', async () => {
    mocks.requiresMFA.mockResolvedValue({ required: true });
    mocks.validateMFAForPayment.mockResolvedValue({ valid: true });
    expect((await run('valid')).status).toBe(200);
    expect(mocks.validateMFAForPayment).toHaveBeenCalledWith(
      user.id,
      'valid',
      'REFUND'
    );
  });
  it('honors anomaly blocks', async () => {
    mocks.detectAnomalies.mockResolvedValue({
      blockedReasons: ['High risk'],
      riskScore: 99,
    });
    expect((await run()).status).toBe(403);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('does not call provider recovery after a rejected reservation', async () => {
    mocks.reserve.mockRejectedValue(
      new ConflictError('Payout already claimed')
    );
    expect((await run()).status).toBe(409);
    expect(mocks.recover).not.toHaveBeenCalled();
  });
  it('does not unlock money after an unknown provider result', async () => {
    mocks.recover.mockRejectedValue(new Error('Provider timeout'));
    expect((await run()).status).toBe(500);
    expect(mocks.escrowUpdate).not.toHaveBeenCalled();
    expect(mocks.jobUpdate).not.toHaveBeenCalled();
  });
  it.each(['pending', 'requires_action', 'failed', 'canceled'])(
    'does not report %s as success',
    async (state) => {
      mocks.recover.mockResolvedValue({
        ...operation,
        state,
        provider_refund_id: 'refund-1',
      });
      const response = await run();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        success: false,
        status: state,
      });
    }
  );
  it('returns cash, credit, and remaining totals from the operation and ledger', async () => {
    mocks.recover.mockResolvedValue({
      ...operation,
      state: 'succeeded',
      cash_minor: 20000,
      credit_minor: 5000,
      provider_refund_id: 'refund-1',
    });
    mocks.context
      .mockResolvedValueOnce({ existing: null, remainingMinor: 25000 })
      .mockResolvedValueOnce({ existing: operation, remainingMinor: 0 });
    const response = await run();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      amount: 250,
      cashAmount: 200,
      creditReturned: 50,
      remainingAmount: 0,
    });
    expect(mocks.checkIdempotency).not.toHaveBeenCalled();
    expect(mocks.storeIdempotencyResult).not.toHaveBeenCalled();
  });
  it('recovers the same full-refund operation after escrow becomes terminal', async () => {
    escrow!.status = 'refunded';
    job!.status = 'completed';
    mocks.validateRequest.mockResolvedValue({
      data: { ...input, amount: undefined },
    });
    mocks.context.mockResolvedValue({
      existing: { ...operation, state: 'succeeded' },
      remainingMinor: 0,
    });
    expect((await run()).status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ grossMinor: 25000 })
    );
  });
  it('binds the caller key to actor and escrow while preserving exact retries', async () => {
    await run();
    await run();
    const first = mocks.reserve.mock.calls[0][0].requestKey;
    expect(mocks.reserve.mock.calls[1][0].requestKey).toBe(first);
    mocks.validateRequest.mockResolvedValue({
      data: { ...input, escrowTransactionId: 'escrow-2' },
    });
    await run();
    expect(mocks.reserve.mock.calls[2][0].requestKey).not.toBe(first);
    mocks.validateRequest.mockResolvedValue({ data: input });
    job!.payer_user_id = 'payer-2';
    escrow!.payer_id = 'payer-2';
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      ...user,
      id: 'payer-2',
    });
    await run();
    expect(mocks.reserve.mock.calls[3][0].requestKey).not.toBe(first);
  });
  it('passes changed payloads to the reservation authority instead of using a stale cache', async () => {
    mocks.reserve.mockRejectedValue(new ConflictError('Refund terms changed'));
    mocks.context.mockResolvedValue({ existing: operation, remainingMinor: 0 });
    mocks.validateRequest.mockResolvedValue({
      data: { ...input, amount: 100, reason: 'Changed reason' },
    });
    expect((await run()).status).toBe(409);
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ grossMinor: 10000, reason: 'Changed reason' })
    );
  });
});
