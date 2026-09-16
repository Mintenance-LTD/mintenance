// @vitest-environment node
// Route contract tests; real ownership/state/rollback invariants also run in
// audit/2026-09-06/remediation-completion-approval.sql against local Postgres.
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  bearer: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  csrf: vi.fn(),
  rate: vi.fn(),
  key: vi.fn(),
  cache: vi.fn(),
  store: vi.fn(),
  email: vi.fn(),
  markEmail: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.auth,
  getCurrentUserFromBearerToken: mocks.bearer,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.csrf }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rate },
}));
vi.mock('@/lib/idempotency', () => ({
  getDeterministicIdempotencyKeyFromRequest: mocks.key,
  checkIdempotency: mocks.cache,
  storeIdempotencyResult: mocks.store,
  releaseOnError: (_key: string, _op: string, fn: () => Promise<unknown>) =>
    fn(),
}));
vi.mock('@/lib/email-service', () => ({
  EmailService: { sendWorkApprovedEmail: mocks.email },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { markEmailSent: mocks.markEmail },
}));
vi.mock('@/lib/cors', () => ({ getCorsHeaders: () => ({}) }));
import { POST } from '@/app/api/jobs/[id]/confirm-completion/route';

const user = {
  id: 'owner',
  role: 'homeowner',
  email: 'synthetic@example.invalid',
};
const completedAt = '2026-09-15T10:00:00.123456+00:00';
const baseJob = {
  id: 'job',
  homeowner_id: 'owner',
  payer_user_id: null,
  contractor_id: 'contractor',
  title: 'Synthetic job',
  status: 'completed',
  completed_at: completedAt,
  completion_confirmed_by_homeowner: false,
};
const decision = {
  applied: true,
  escrowId: 'fb160906-0000-4000-8000-000000000020',
  amount: 500,
  coolingOffEndsAt: '2026-09-17T10:00:00+00:00',
  notificationId: 'fb160906-0000-4000-8000-000000000030',
};
let job: Record<string, unknown> | null;
const send = () =>
  POST(
    new NextRequest('http://localhost/api/jobs/job/confirm-completion', {
      method: 'POST',
      headers: { 'x-csrf-token': 'synthetic' },
      body: JSON.stringify({ completedAt }),
    }),
    { params: Promise.resolve({ id: 'job' }) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  job = { ...baseJob };
  mocks.auth.mockResolvedValue(user);
  mocks.bearer.mockResolvedValue(null);
  mocks.csrf.mockResolvedValue(undefined);
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.key.mockReturnValue('scoped-key');
  mocks.cache.mockResolvedValue({
    isDuplicate: false,
    ownership: { userId: user.id, claimToken: 'synthetic' },
  });
  mocks.store.mockResolvedValue(undefined);
  mocks.email.mockResolvedValue(true);
  mocks.markEmail.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ data: decision, error: null });
  mocks.from.mockImplementation((table: string) => {
    if (!['jobs', 'profiles'].includes(table))
      throw new Error('Unexpected nontransactional table access: ' + table);
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      single: async () => ({
        data:
          table === 'jobs'
            ? job
            : {
                email: 'contractor@example.invalid',
                first_name: 'Synthetic',
                last_name: 'User',
              },
        error: null,
      }),
    };
    return query;
  });
});

it('requires authentication', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await send()).status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('rejects contractor role', async () => {
  mocks.auth.mockResolvedValue({ ...user, role: 'contractor' });
  expect((await send()).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('rejects missing job', async () => {
  job = null;
  expect((await send()).status).toBe(404);
});
it.each(['unrelated', 'contractor'])(
  'rejects %s before consulting cached success',
  async (actor) => {
    mocks.auth.mockResolvedValue({ ...user, id: actor });
    expect((await send()).status).toBe(403);
    expect(mocks.cache).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  }
);
it('rejects owner when another payer is designated', async () => {
  job!.payer_user_id = 'payer';
  expect((await send()).status).toBe(403);
});
it('allows the designated payer and passes the precise completion version to the transaction', async () => {
  job!.payer_user_id = 'payer';
  mocks.auth.mockResolvedValue({ ...user, id: 'payer' });
  expect((await send()).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith(
    'approve_job_completion',
    expect.objectContaining({
      p_job_id: 'job',
      p_actor_id: 'payer',
      p_expected_completed_at: completedAt,
      p_automatic: false,
      p_waive_cooling_off: false,
    })
  );
});
it('blocks cached success when work has been reopened', async () => {
  job!.status = 'in_progress';
  mocks.cache.mockResolvedValue({
    isDuplicate: true,
    cachedResult: { success: true },
  });
  expect((await send()).status).toBe(400);
  expect(mocks.cache).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('binds the idempotency identity and payload to the completion cycle', async () => {
  expect((await send()).status).toBe(200);
  expect(mocks.key).toHaveBeenCalledWith(
    expect.anything(),
    'confirm_completion',
    'owner',
    JSON.stringify(['job', completedAt])
  );
  expect(mocks.cache).toHaveBeenCalledWith(
    'scoped-key',
    'confirm_completion',
    true,
    {
      userId: 'owner',
      request: { jobId: 'job', completedAt },
    }
  );
});
it('rechecks a cached decision in the transaction to detect a concurrent rework', async () => {
  mocks.cache.mockResolvedValue({
    isDuplicate: true,
    cachedResult: { success: true },
  });
  mocks.rpc.mockResolvedValue({
    data: null,
    error: {
      code: '23514',
      message: 'The job completion changed. Refresh before approving.',
    },
  });
  expect((await send()).status).toBe(409);
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.email).not.toHaveBeenCalled();
});
it.each([
  ['23514', 'Verified after-photos are required for this completion', 409],
  ['23514', 'The payment is not available for approval', 409],
  ['42501', 'Not authorized', 403],
  ['P0002', 'Missing escrow', 404],
  ['XX001', 'Synthetic storage failure', 500],
])(
  'maps transaction failure %s (%s) without confirmation or email',
  async (code, message, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code, message } });
    expect((await send()).status).toBe(status);
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  }
);
it('rejects an empty RPC response rather than reporting success', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  expect((await send()).status).toBe(500);
  expect(mocks.email).not.toHaveBeenCalled();
  expect(mocks.store).not.toHaveBeenCalled();
});
it('reports approval pending release checks and uses the committed amount and notification', async () => {
  const response = await send();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    coolingOffEndsAt: decision.coolingOffEndsAt,
  });
  expect(mocks.email).toHaveBeenCalledWith(
    'contractor@example.invalid',
    expect.objectContaining({ amount: 500 })
  );
  expect(mocks.markEmail).toHaveBeenCalledWith(decision.notificationId);
});
it('recovers an already committed decision without extending approval or sending email again', async () => {
  job!.completion_confirmed_by_homeowner = true;
  mocks.rpc.mockResolvedValue({
    data: { ...decision, applied: false, notificationId: null },
    error: null,
  });
  expect((await send()).status).toBe(200);
  expect(mocks.email).not.toHaveBeenCalled();
});
it('recovers after the response-cache write fails following a committed decision', async () => {
  mocks.store.mockRejectedValueOnce(new Error('Synthetic cache unavailable'));
  expect((await send()).status).toBe(500);
  mocks.rpc.mockResolvedValue({
    data: { ...decision, applied: false, notificationId: null },
    error: null,
  });
  expect((await send()).status).toBe(200);
  expect(mocks.email).toHaveBeenCalledTimes(1);
});
it('does not turn supplementary email failure into a failed approval', async () => {
  mocks.email.mockRejectedValueOnce(new Error('Synthetic mail outage'));
  expect((await send()).status).toBe(200);
  expect(mocks.store).toHaveBeenCalled();
});

it('passes the client-reviewed completion version rather than silently approving newer work', async () => {
  const reviewedAt = '2026-09-14T09:00:00Z';
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { code: '23514', message: 'The job completion changed' },
  });
  const response = await POST(
    new NextRequest('http://localhost/api/jobs/job/confirm-completion', {
      method: 'POST',
      headers: { 'x-csrf-token': 'synthetic' },
      body: JSON.stringify({ completedAt: reviewedAt }),
    }),
    { params: Promise.resolve({ id: 'job' }) }
  );
  expect(response.status).toBe(409);
  expect(mocks.rpc).toHaveBeenCalledWith(
    'approve_job_completion',
    expect.objectContaining({ p_expected_completed_at: reviewedAt })
  );
  expect(mocks.email).not.toHaveBeenCalled();
});

it.each([undefined, {}, { completedAt: null }, { completedAt: 'invalid' }])(
  'rejects missing or invalid displayed completion before reads or replay',
  async (body) => {
    const response = await POST(
      new NextRequest('http://localhost/api/jobs/job/confirm-completion', {
        method: 'POST',
        headers: { 'x-csrf-token': 'synthetic' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: 'job' }) }
    );
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.cache).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  }
);
