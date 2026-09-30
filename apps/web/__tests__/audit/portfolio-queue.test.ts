// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mock.rpc },
}));
import { GET } from '@/app/api/portfolio/queue/route';
const call = (query: string) =>
  (
    GET as unknown as (
      request: NextRequest,
      context: unknown
    ) => Promise<Response>
  )(new NextRequest(`http://localhost/api/portfolio/queue?${query}`), {
    user: { id: 'verified-user' },
  });
beforeEach(() => {
  vi.clearAllMocks();
  mock.rpc.mockResolvedValue({
    data: { items: [], total: 0, hasMore: false },
    error: null,
  });
});
it('always uses the authenticated identity, ignoring caller-supplied identity', async () => {
  await call('userId=other-user&offset=25&limit=25');
  expect(mock.rpc).toHaveBeenCalledWith('portfolio_action_queue', {
    p_user_id: 'verified-user',
    p_offset: 25,
    p_limit: 25,
  });
});
it.each(['offset=-1', 'offset=1.5', 'limit=101', 'limit=oops'])(
  'rejects invalid pagination %s',
  async (query) => {
    await expect(call(query)).rejects.toThrow('Invalid queue pagination');
    expect(mock.rpc).not.toHaveBeenCalled();
  }
);
it('never converts provider failure into an empty successful queue', async () => {
  mock.rpc.mockResolvedValue({
    data: null,
    error: new Error('synthetic database failure'),
  });
  await expect(call('')).rejects.toThrow('synthetic database failure');
});
