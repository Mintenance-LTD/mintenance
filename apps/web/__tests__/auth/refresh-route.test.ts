import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
/** @jest-environment node */
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => {
  const store = new Map<string, string>();
  return {
    cookies: async () => ({
      get: (k: string) => (store.has(k) ? { name: k, value: store.get(k)! } : undefined),
      set: (k: string, v: string) => void store.set(k, v),
      delete: (k: string) => void store.delete(k),
      _store: store,
    }),
  };
});

vi.mock('@/lib/auth', () => {
  return {
    rotateTokens: vi.fn(async () => ({ accessToken: 'new-access', refreshToken: 'new-refresh' })),
    setAuthCookie: vi.fn(async () => undefined),
    verifyToken: vi.fn(async () => ({ sub: 'u1', email: 'u@example.com', role: 'homeowner', exp: Math.floor(Date.now()/1000) + 10 })),
  };
});

describe('POST /api/auth/refresh', () => {
  it('401 when refresh-token missing and token exp < 15m', async () => {
    const mod = await import('../../../app/api/auth/refresh/route');
    const { cookies } = await import('next/headers');
    const cs = await cookies();
    cs.set('auth-token', 'old-access');

    const res = await mod.POST({} as unknown as NextRequest);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toMatch(/Missing refresh token/);
  });

  it('rotates tokens when refresh present and valid', async () => {
    const mod = await import('../../../app/api/auth/refresh/route');
    const { cookies } = await import('next/headers');
    const lib = await import('@/lib/auth');
    const cs = await cookies();
    vi.mocked(lib.verifyToken).mockResolvedValueOnce({ sub: 'u1', email: 'u@example.com', role: 'homeowner', exp: Math.floor(Date.now()/1000) + 10 });
    cs.set('auth-token', 'old-access');
    cs.set('refresh-token', 'old-refresh');

    const res = await mod.POST({} as unknown as NextRequest);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expectvi.mocked((lib.rotateTokens)).toHaveBeenCalled();
    expectvi.mocked((lib.setAuthCookie)).toHaveBeenCalled();
  });

  it('401 for invalid refresh token', async () => {
    const mod = await import('../../../app/api/auth/refresh/route');
    const { cookies } = await import('next/headers');
    const lib = await import('@/lib/auth');
    const cs = await cookies();
    vi.mocked(lib.verifyToken).mockResolvedValueOnce({ sub: 'u1', email: 'u@example.com', role: 'homeowner', exp: Math.floor(Date.now()/1000) + 10 });
    vi.mocked(lib.rotateTokens).mockRejectedValueOnce(new Error('Invalid refresh token'));
    cs.set('auth-token', 'old-access');
    cs.set('refresh-token', 'bad-refresh');

    const res = await mod.POST({} as unknown as NextRequest);
    expect(res.status).toBe(401);
  });
});