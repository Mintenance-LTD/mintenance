import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  session: vi.fn(),
  update: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  createAnonClient: () => ({
    auth: { setSession: m.session, updateUser: m.update, signOut: m.signOut },
  }),
}));
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: true }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/rate-limiter', () => ({
  checkPasswordResetRateLimit: async () => ({ allowed: true }),
}));
vi.mock('@mintenance/auth', () => ({
  PasswordValidator: { validate: () => ({ isValid: true }) },
  checkPasswordBreach: async () => ({ isBreached: false }),
}));
import { POST } from '@/app/api/auth/reset-password/route';
const accessToken =
  'syntheticheader.syntheticrecoverypayloadlongenough.synthetic-signature';
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
beforeEach(() => {
  m.session.mockResolvedValue({ error: null });
  m.update.mockResolvedValue({
    data: { user: { id: 'synthetic-user' } },
    error: null,
  });
  m.signOut.mockResolvedValue({ error: null });
});
it('restores the complete recovery session before changing the password', async () => {
  const response = await POST(
    request({
      accessToken,
      refreshToken: 'synthetic-refresh',
      password: 'Fresh-Password!7429',
    }),
    {} as never
  );
  expect(response.status).toBe(200);
  expect(m.session).toHaveBeenCalledWith({
    access_token: accessToken,
    refresh_token: 'synthetic-refresh',
  });
  expect(m.update).toHaveBeenCalledWith({ password: 'Fresh-Password!7429' });
  expect(m.signOut).toHaveBeenCalled();
});
it('rejects incomplete recovery credentials before updating an account', async () => {
  await expect(
    POST(request({ accessToken, password: 'Fresh-Password!7429' }), {} as never)
  ).rejects.toThrow();
  expect(m.session).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
});
it('does not change a password when Supabase rejects the recovery session', async () => {
  m.session.mockResolvedValue({ error: { message: 'Session expired' } });
  await expect(
    POST(
      request({
        accessToken,
        refreshToken: 'synthetic-refresh',
        password: 'Fresh-Password!7429',
      }),
      {} as never
    )
  ).rejects.toThrow('Invalid or expired reset link');
  expect(m.update).not.toHaveBeenCalled();
});
