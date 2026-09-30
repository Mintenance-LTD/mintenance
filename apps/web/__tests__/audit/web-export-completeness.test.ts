// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({ from: vi.fn(), failed: '' }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: mock,
  createRequestScopedClient: () => mock,
}));
import { POST } from '@/app/api/user/export-data/route';
beforeEach(() => {
  mock.failed = '';
  mock.from.mockImplementation((table: string) => {
    const result = () => ({
      data: table === 'profiles' ? { id: 'synthetic' } : [],
      error: table === mock.failed ? { message: 'offline' } : null,
    });
    const chain = {
      select: () => chain,
      eq: () => chain,
      or: () => chain,
      insert: () => chain,
      single: async () => result(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(resolve(result())),
    };
    return chain;
  });
});
const call = () =>
  (
    POST as unknown as (
      request: NextRequest,
      context: unknown
    ) => Promise<Response>
  )(
    new NextRequest('http://localhost/api/user/export-data', {
      method: 'POST',
    }),
    { user: { id: 'synthetic' } }
  );
it.each([
  'profiles',
  'properties',
  'jobs',
  'messages',
  'escrow_transactions',
  'contracts',
])(
  'does not download a falsely complete export when %s fails',
  async (table) => {
    mock.failed = table;
    await expect(call()).rejects.toThrow('complete export is unavailable');
  }
);
it('allows a download when every requested category succeeds', async () => {
  expect((await call()).status).toBe(200);
});
