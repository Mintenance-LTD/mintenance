import { act, renderHook } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  resend: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  options: {} as Record<string, unknown>,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  createAnonClient: () => ({ auth: { resend: m.resend } }),
}));
vi.mock('@/lib/env', () => ({ getAppUrl: () => 'http://localhost:3017' }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: Record<string, unknown>, handler: unknown) => {
    m.options = options;
    return handler;
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push, refresh: m.refresh }),
  useSearchParams: () => new URLSearchParams('invite=synthetic-invitation'),
}));
vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: 'synthetic-csrf', loading: false }),
}));
import { POST } from '@/app/api/auth/resend-verification/route';
import {
  useRegisterSubmit,
  type RegisterFormData,
} from '@/app/register/useRegisterSubmit';
const call = (email = 'synthetic@example.invalid') =>
  (POST as unknown as (r: NextRequest) => Promise<Response>)(
    new NextRequest('http://localhost:3017/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.resend.mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('allows unconfirmed signed-out recovery with a bounded anonymous rate limit', async () => {
  expect(m.options).toMatchObject({
    auth: false,
    rateLimit: { maxRequests: 3, windowMs: 900000 },
  });
  const response = await call();
  expect(response.status).toBe(200);
  expect(m.resend).toHaveBeenCalledWith({
    type: 'signup',
    email: 'synthetic@example.invalid',
    options: { emailRedirectTo: 'http://localhost:3017/auth/callback' },
  });
  expect((await response.json()).message).toContain('If this address');
});
it.each([429, 500])(
  'reports provider failure %s without falsely claiming delivery or exposing provider details',
  async (status) => {
    m.resend.mockResolvedValue({
      error: { status, message: 'private provider detail' },
    });
    const response = await call();
    expect(response.status).toBe(status === 429 ? 429 : 503);
    expect(await response.text()).not.toContain('private provider detail');
  }
);
it('reports interrupted provider calls as retryable failures', async () => {
  m.resend.mockRejectedValue(new Error('private detail'));
  expect((await call()).status).toBe(503);
});
it('validates email before contacting Auth', async () => {
  expect((await call('invalid')).status).toBe(400);
  expect(m.resend).not.toHaveBeenCalled();
});
it('keeps registration on the verification step and preserves the invitation through sign-in', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ requiresEmailVerification: true }),
  });
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useRegisterSubmit());
  await act(async () => {
    await result.current.onSubmit({
      email: 'synthetic@example.invalid',
      role: 'homeowner',
    } as RegisterFormData);
  });
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(result.current.verificationRequired).toBe(true);
  expect(m.push).not.toHaveBeenCalled();
  expect(
    new URL(
      result.current.verificationLoginPath,
      'http://localhost'
    ).searchParams.get('redirect')
  ).toBe('/register/invitation?token=synthetic-invitation');
  fetchMock.mockRejectedValueOnce(new Error('connection lost'));
  await act(async () => {
    await result.current.resendVerification();
  });
  expect(result.current.resendMessage).toContain('Connection interrupted');
  expect(result.current.resending).toBe(false);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ message: 'Link requested' }),
  });
  await act(async () => {
    await result.current.resendVerification();
  });
  expect(result.current.resendMessage).toBe('Link requested');
});
