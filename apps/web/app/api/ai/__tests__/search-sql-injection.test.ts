// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ from: vi.fn(), or: vi.fn(), ilike: vi.fn(), result: { data: [], error: null } as { data: unknown[]; error: unknown } }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
import { POST } from '../search/route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.result = { data: [], error: null };
  mocks.from.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order', 'limit', 'gte', 'lte', 'contains']) chain[method] = () => chain;
    mocks.or.mockReturnValue(chain);
    mocks.ilike.mockReturnValue(chain);
    chain.or = mocks.or;
    chain.ilike = mocks.ilike;
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mocks.result).then(resolve);
    return chain;
  });
});
function call(body: unknown) {
  return POST(new NextRequest('http://localhost/api/ai/search', { method: 'POST', body: JSON.stringify(body) }), {} as never);
}
it.each(["plumber',id.neq.null", 'plumber%_\\', 'plumber);DROP TABLE profiles;--', 'plumber UNION SELECT email'])('keeps hostile query text inside a sanitized directory search: %s', async query => {
  expect((await call({ query })).status).toBe(200);
  expect(mocks.from).toHaveBeenCalledWith('profile_directory');
  expect(mocks.from).toHaveBeenCalledTimes(1);
  const predicate = mocks.or.mock.calls[1][0] as string;
  expect(predicate).not.toContain('id.neq.null');
  expect(predicate.split(',')).toHaveLength(4);
  expect(predicate).not.toContain(');');
});
it('sanitizes the city filter without accessing precise locations', async () => {
  expect((await call({ query: 'plumber', filters: { location: 'London%,id.neq.null' } })).status).toBe(200);
  expect(mocks.ilike).toHaveBeenCalledWith('city', expect.any(String));
  expect(mocks.ilike.mock.calls[0][1]).not.toContain(',');
});
it.each([
  { query: '' }, { query: 'x'.repeat(501) }, { query: {} },
  { query: 'x', limit: 0 }, { query: 'x', limit: 101 },
  { query: 'x', filters: { unknown: 'private' } },
  { query: 'x', filters: { rating: null } },
  { query: 'x', filters: { rating: '5' } },
  { query: 'x', filters: { rating: 6 } },
  { query: 'x', filters: { location: { $ne: null } } },
  { query: 'x', filters: { category: ['plumbing'] } },
  { query: 'x', filters: { priceRange: { min: -1 } } },
  { query: 'x', filters: { priceRange: { max: null } } },
])('rejects invalid inputs before querying: %j', async body => {
  expect((await call(body)).status).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});
it('surfaces database failure instead of pretending there were no results', async () => {
  mocks.result.error = { message: 'unavailable' };
  await expect(call({ query: 'plumber' })).rejects.toMatchObject({ statusCode: 500 });
});
it('rejects malformed JSON', async () => {
  const response = await POST(new NextRequest('http://localhost/api/ai/search', { method: 'POST', body: '{' }), {} as never);
  expect(response.status).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});