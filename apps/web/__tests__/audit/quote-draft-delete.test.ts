// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  remove: vi.fn(),
  deleted: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      let deleting = false;
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          mocks.eq(...args);
          return query;
        },
        is: (...args: unknown[]) => {
          mocks.is(...args);
          return query;
        },
        delete: () => {
          deleting = true;
          mocks.remove();
          return query;
        },
        maybeSingle: () => (deleting ? mocks.deleted() : mocks.read()),
      };
      return query;
    },
  },
}));
import { DELETE as canonical } from '@/app/api/contractor/quotes/[id]/route';
import { DELETE as legacy } from '@/app/api/contractor/delete-quote/route';
const id = '11111111-1111-4111-8111-111111111111';
const version = '2026-11-06T12:00:00.123456Z';
type Handler = (
  req: NextRequest,
  context: { user: { id: string }; params: { id: string } }
) => Promise<Response>;
const call = (route: typeof canonical, body?: unknown) =>
  (route as unknown as Handler)(
    new NextRequest('http://localhost/api/quote', {
      method: 'DELETE',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    { user: { id: 'actor' }, params: { id } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({
    data: { id, status: 'draft', updated_at: version },
    error: null,
  });
  mocks.deleted.mockResolvedValue({ data: { id }, error: null });
});
it.each([canonical, legacy])(
  'guards both deletion routes with actor/status/version',
  async (handler) => {
    const body = {
      expected_updated_at: version,
      ...(handler === legacy ? { quoteId: id } : {}),
    };
    expect((await call(handler, body)).status).toBe(200);
    expect(mocks.eq.mock.calls.slice(-4)).toEqual([
      ['id', id],
      ['contractor_id', 'actor'],
      ['status', 'draft'],
      ['updated_at', version],
    ]);
  }
);
it.each(['sent', 'viewed', 'accepted', 'rejected', 'expired'])(
  'cannot delete a %s quote through either route',
  async (status) => {
    mocks.read.mockResolvedValue({
      data: { id, status, updated_at: version },
      error: null,
    });
    for (const handler of [canonical, legacy])
      await expect(
        call(handler, handler === legacy ? { quoteId: id } : undefined)
      ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.remove).not.toHaveBeenCalled();
  }
);
it('supports older bodyless callers with a server-read version predicate', async () => {
  await call(canonical);
  expect(mocks.eq).toHaveBeenCalledWith('updated_at', version);
});
it('preserves null version semantics rather than removing the predicate', async () => {
  await call(canonical, { expected_updated_at: null });
  expect(mocks.is).toHaveBeenCalledWith('updated_at', null);
});
it('does not claim deletion if another operation changed the draft', async () => {
  mocks.deleted.mockResolvedValue({ data: null, error: null });
  await expect(call(canonical)).rejects.toMatchObject({ statusCode: 409 });
});
it('distinguishes database failures from an unowned quote', async () => {
  mocks.read
    .mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    .mockResolvedValueOnce({ data: null, error: null });
  await expect(call(canonical)).rejects.toMatchObject({ statusCode: 500 });
  await expect(call(canonical)).rejects.toMatchObject({ statusCode: 404 });
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('does not claim success when deleting fails', async () => {
  mocks.deleted.mockResolvedValue({
    data: null,
    error: { message: 'offline' },
  });
  await expect(call(canonical)).rejects.toMatchObject({ statusCode: 500 });
});
it('rejects invalid versions before reading or deleting', async () => {
  await expect(
    call(canonical, { expected_updated_at: 'invalid' })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
