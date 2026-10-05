import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ cached: vi.fn(), sync: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/stripe/connect/accounts', () => ({
  getCachedAccountStatus: mocks.cached,
  syncAccountStatus: mocks.sync,
}));
import { GET } from '@/app/api/payments/stripe-connect/status/route';
beforeEach(() => vi.clearAllMocks());
const invoke = (refresh: boolean) =>
  (GET as unknown as (request: Request, context: unknown) => Promise<Response>)(
    new Request(
      `https://example.test/api/payments/stripe-connect/status?refresh=${refresh}`
    ),
    { user: { id: 'fixture' } }
  );
it('refreshes existing accounts rather than reporting cached readiness', async () => {
  mocks.cached.mockResolvedValue({ canReceivePayouts: true });
  mocks.sync.mockResolvedValue({ canReceivePayouts: false });
  expect(await (await invoke(true)).json()).toEqual({
    success: true,
    status: { canReceivePayouts: false },
  });
  expect(mocks.sync).toHaveBeenCalledWith('fixture');
});
it('returns no account without attempting a provider refresh', async () => {
  mocks.cached.mockResolvedValue(null);
  expect(await (await invoke(true)).json()).toEqual({
    success: true,
    status: null,
  });
  expect(mocks.sync).not.toHaveBeenCalled();
});
it('propagates refresh failures instead of falling back to stale readiness', async () => {
  mocks.cached.mockResolvedValue({ canReceivePayouts: true });
  const error = new Error('configuration mismatch');
  mocks.sync.mockRejectedValue(error);
  await expect(invoke(true)).rejects.toBe(error);
});
