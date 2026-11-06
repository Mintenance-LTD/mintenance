// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  owner: vi.fn(),
  saved: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          mocks.eq(...args);
          return query;
        },
        single: mocks.owner,
        maybeSingle: mocks.saved,
        update: (...args: unknown[]) => {
          mocks.update(...args);
          return query;
        },
      };
      return query;
    },
  },
}));
import { PUT } from '@/app/api/contractor/quotes/[id]/route';
const handler = PUT as unknown as (
  req: NextRequest,
  context: { user: { id: string; role: string }; params: { id: string } }
) => Promise<Response>;
const call = (
  body: Record<string, unknown> = {
    title: 'Updated title',
    expected_status: 'draft',
  }
) =>
  handler(
    new NextRequest('http://localhost/api/contractor/quotes/quote', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    { user: { id: 'actor', role: 'contractor' }, params: { id: 'quote' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner.mockResolvedValue({ data: { id: 'quote' }, error: null });
  mocks.saved.mockResolvedValue({
    data: { id: 'quote', status: 'draft', title: 'Updated title' },
    error: null,
  });
});
it('conditions the saved mutation on actor, id and draft status', async () => {
  const response = await call();
  expect(response.status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Updated title' })
  );
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('expected_status');
  expect(mocks.eq.mock.calls.slice(-3)).toEqual([
    ['id', 'quote'],
    ['contractor_id', 'actor'],
    ['status', 'draft'],
  ]);
  expect((await response.json()).quote.id).toBe('quote');
});
it('returns a conflict when the draft status changed before the update', async () => {
  mocks.saved.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 409 });
});
it('does not attempt a mutation if ownership cannot be established', async () => {
  mocks.owner.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 404 });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('rejects unsupported expected statuses before querying', async () => {
  const response = await call({
    title: 'New title',
    expected_status: 'accepted',
  });
  expect(response.status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});
it('does not convert a database failure into a stale-draft conflict', async () => {
  mocks.saved.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(call()).rejects.toMatchObject({ statusCode: 500 });
});
