import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  reset: vi.fn(),
  from: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: m.from,
    auth: {
      resetPasswordForEmail: m.reset,
      admin: { updateUserById: m.confirm },
    },
  },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/rate-limiter', () => ({
  checkPasswordResetRateLimit: async () => ({ allowed: true }),
  createRateLimitHeaders: () => ({}),
}));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async () => ({ data: { email: 'synthetic@example.test' } }),
}));
import { POST } from '@/app/api/auth/forgot-password/route';
beforeEach(() => vi.clearAllMocks());
it.each([null, { message: 'Email not confirmed', status: 400 }])(
  'never verifies account ownership during recovery: %j',
  async (error) => {
    m.reset.mockResolvedValue({ error });
    const response = await POST(
      new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
      }),
      {} as never
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message:
        'If an account exists with this email, you will receive a password reset link shortly.',
    });
    expect(m.reset).toHaveBeenCalledTimes(1);
    expect(m.from).not.toHaveBeenCalled();
    expect(m.confirm).not.toHaveBeenCalled();
  }
);
