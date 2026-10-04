import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, rpc: mocks.rpc, storage: { from: mocks.storage } },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => handler,
}));
import { POST } from '@/app/api/contractor/training-contribution/route';

it('rejects training contributions before reading bytes, storing data or granting rewards', async () => {
  const formData = vi.fn();
  const response = await POST({ formData } as never, { user: { id: 'contractor' } } as never);
  expect(response.status).toBe(503);
  expect((await response.json()).code).toBe('TRAINING_CONTRIBUTIONS_UNAVAILABLE');
  expect(formData).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.storage).not.toHaveBeenCalled();
});
