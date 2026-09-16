import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  status: vi.fn(),
  disable: vi.fn(),
  rate: vi.fn(),
  audit: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  createAnonClient: () => ({
    auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut },
  }),
}));
vi.mock('@/lib/mfa/mfa-service', () => ({
  MFAService: { getMFAStatus: mocks.status, disableMFA: mocks.disable },
}));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rate },
}));
vi.mock('@/lib/audit', () => ({
  logAuditEvent: mocks.audit,
  getClientIp: () => '127.0.0.1',
}));
import { POST } from '@/app/api/auth/mfa/disable/route';
const user = {
  id: 'fa400906-0000-4000-8000-000000000001',
  email: 'synthetic@example.invalid',
};
const handler = POST as unknown as (
  request: NextRequest,
  context: { user: typeof user }
) => Promise<Response>;
const call = (
  body = JSON.stringify({ password: 'synthetic-current-password' })
) =>
  handler(
    new NextRequest('http://localhost/api/auth/mfa/disable', {
      method: 'POST',
      body,
    }),
    { user }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ data: { user, session: {} }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.status.mockResolvedValue({ enabled: true });
  mocks.disable.mockResolvedValue(undefined);
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.audit.mockResolvedValue(undefined);
});
it('binds password verification to the actor and disposes only the temporary session before mutation', async () => {
  expect((await call()).status).toBe(200);
  expect(mocks.signIn).toHaveBeenCalledWith({
    email: user.email,
    password: 'synthetic-current-password',
  });
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.disable.mock.invocationCallOrder[0]
  );
  expect(mocks.disable).toHaveBeenCalledWith(user.id);
  expect(mocks.rate).toHaveBeenCalledWith(
    expect.objectContaining({
      identifier: `mfa-disable:${user.id}`,
      criticality: 'auth',
    })
  );
});
it.each([
  { data: { user: { id: 'another-user' }, session: {} }, error: null },
  { data: { user, session: null }, error: null },
  { data: null, error: { message: 'Invalid credentials' } },
])(
  'rejects unconfirmed identity/session without disabling MFA',
  async (result) => {
    mocks.signIn.mockResolvedValue(result);
    await expect(call()).rejects.toMatchObject({ statusCode: 401 });
    expect(mocks.disable).not.toHaveBeenCalled();
  }
);
it('does not mutate MFA when temporary session cleanup fails', async () => {
  mocks.signOut.mockResolvedValue({ error: { message: 'synthetic outage' } });
  await expect(call()).rejects.toMatchObject({ statusCode: 500 });
  expect(mocks.disable).not.toHaveBeenCalled();
});
it('rejects invalid JSON and oversized passwords before provider calls', async () => {
  await expect(call('{')).rejects.toMatchObject({ statusCode: 400 });
  await expect(
    call(JSON.stringify({ password: 'x'.repeat(1025) }))
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(mocks.signIn).not.toHaveBeenCalled();
});
it('denies rate-limited requests before password verification', async () => {
  mocks.rate.mockResolvedValue({ allowed: false });
  await expect(call()).rejects.toMatchObject({ statusCode: 429 });
  expect(mocks.signIn).not.toHaveBeenCalled();
});
it('does not report success when database disabling fails', async () => {
  mocks.disable.mockRejectedValue(new Error('synthetic database failure'));
  await expect(call()).rejects.toThrow('synthetic database failure');
  expect(mocks.audit).not.toHaveBeenCalledWith(
    expect.objectContaining({ action: 'disable' })
  );
});
