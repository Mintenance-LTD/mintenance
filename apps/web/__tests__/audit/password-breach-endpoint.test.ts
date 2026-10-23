import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { check } = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('@mintenance/auth', () => ({ checkPasswordBreach: check }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
import { POST } from '@/app/api/auth/check-password-breach/route';
const call = () =>
  POST(
    new NextRequest('http://localhost/api/auth/check-password-breach', {
      method: 'POST',
      body: JSON.stringify({ password: 'SyntheticFresh9!' }),
    }),
    {} as never
  );
beforeEach(() => vi.clearAllMocks());
it('returns a positive completion marker for mobile clients', async () => {
  check.mockResolvedValue({ checked: true, isBreached: false });
  expect(await (await call()).json()).toEqual({
    checked: true,
    isBreached: false,
    occurrences: null,
  });
});
it('returns an unavailable error instead of a misleading clean result', async () => {
  check.mockResolvedValue({ checked: false, isBreached: false });
  await expect(call()).rejects.toMatchObject({ statusCode: 503 });
});
