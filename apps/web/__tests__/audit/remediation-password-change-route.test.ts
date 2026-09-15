import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  rate: vi.fn(),
  rpc: vi.fn(),
  snapshot: vi.fn(),
  identity: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  update: vi.fn(),
  status: vi.fn(),
  verify: vi.fn(),
  breach: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: m.rpc,
    from: () => ({ select: () => ({ eq: () => ({ single: m.snapshot }) }) }),
    auth: { admin: { getUserById: m.identity, updateUserById: m.update } },
  },
  createAnonClient: () => ({
    auth: { signInWithPassword: m.signIn, signOut: m.signOut },
  }),
}));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: m.rate },
}));
vi.mock('@/lib/mfa/mfa-service', () => ({
  MFAService: { getMFAStatus: m.status, verifyMFA: m.verify },
}));
vi.mock('@mintenance/auth', async () => ({
  ...(await vi.importActual('@mintenance/auth')),
  checkPasswordBreach: m.breach,
}));
import { POST } from '@/app/api/auth/change-password/route';
const user = {
  id: 'fa410906-0000-4000-8000-000000000001',
  email: 'synthetic@example.invalid',
};
const op = 'fa410906-0000-4000-8000-000000000002';
const body = {
  currentPassword: 'SyntheticOld1!Password',
  newPassword: 'SyntheticNew2!Password',
};
const handler = POST as unknown as (
  request: NextRequest,
  context: { user: typeof user }
) => Promise<Response>;
const call = (payload: unknown = body) =>
  handler(
    new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    { user }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.rate.mockResolvedValue({ allowed: true });
  m.snapshot.mockResolvedValue({
    data: { tokens_revoked_at: null },
    error: null,
  });
  m.identity.mockResolvedValue({ data: { user }, error: null });
  m.signIn.mockResolvedValue({ data: { user, session: {} }, error: null });
  m.signOut.mockResolvedValue({ error: null });
  m.update.mockResolvedValue({ data: { user }, error: null });
  m.status.mockResolvedValue({ enabled: false });
  m.verify.mockResolvedValue({ success: true });
  m.breach.mockResolvedValue({ isBreached: false });
  m.rpc.mockImplementation(async (name: string) => ({
    data: name === 'begin_password_change' ? op : null,
    error: null,
  }));
});
it('derives identity, records cleanup before provider mutation and confirms completion afterward', async () => {
  const response = await call();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    requestId: op,
    status: 'completed',
  });
  expect(m.rpc).toHaveBeenCalledWith('begin_password_change', {
    p_user_id: user.id,
    p_expected_revoked_at: null,
  });
  expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(
    m.update.mock.invocationCallOrder[0]
  );
  expect(m.rpc.mock.invocationCallOrder[1]).toBeGreaterThan(
    m.update.mock.invocationCallOrder[0]
  );
  expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('rejects another Auth identity before creating an operation', async () => {
  m.signIn.mockResolvedValue({
    data: { user: { id: 'another-user' }, session: {} },
    error: null,
  });
  await expect(call()).rejects.toMatchObject({ statusCode: 401 });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('requires fresh MFA and rejects invalid codes', async () => {
  m.status.mockResolvedValue({ enabled: true });
  expect((await call()).status).toBe(403);
  expect(m.update).not.toHaveBeenCalled();
  m.verify.mockResolvedValue({ success: false });
  await expect(call({ ...body, mfaCode: '123456' })).rejects.toMatchObject({
    statusCode: 401,
  });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('blocks provider mutation when the journal cannot be created or verification became stale', async () => {
  m.rpc.mockResolvedValue({ error: { code: '55000' } });
  await expect(call()).rejects.toMatchObject({ statusCode: 409 });
  expect(m.update).not.toHaveBeenCalled();
});
it('keeps cleanup queued after an ambiguous provider failure without replaying the password', async () => {
  m.update.mockRejectedValue(new Error('synthetic lost connection'));
  const response = await call();
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({
    success: false,
    status: 'pending',
  });
  expect(m.update).toHaveBeenCalledTimes(1);
  expect(m.rpc).toHaveBeenCalledTimes(1);
});
it('reports pending after provider success but failed final database acknowledgement', async () => {
  m.rpc.mockImplementation(async (name: string) =>
    name === 'begin_password_change'
      ? { data: op, error: null }
      : { error: { message: 'synthetic failure' } }
  );
  const response = await call();
  expect(response.status).toBe(202);
  expect((await response.json()).success).toBe(false);
});
it('rejects extra actor IDs, weak passwords and breached passwords', async () => {
  await expect(call({ ...body, userId: 'another-user' })).rejects.toMatchObject(
    { statusCode: 400 }
  );
  await expect(call({ ...body, newPassword: 'weak' })).rejects.toMatchObject({
    statusCode: 400,
  });
  m.breach.mockResolvedValue({ isBreached: true });
  await expect(call()).rejects.toMatchObject({ statusCode: 400 });
  expect(m.update).not.toHaveBeenCalled();
});

it('rate limits password checks by the authenticated account before provider calls', async () => {
  m.rate.mockResolvedValue({ allowed: false });
  await expect(call()).rejects.toMatchObject({ statusCode: 429 });
  expect(m.signIn).not.toHaveBeenCalled();
  expect(m.rate).toHaveBeenCalledWith(
    expect.objectContaining({
      identifier: `password-change:${user.id}`,
      criticality: 'auth',
    })
  );
});
