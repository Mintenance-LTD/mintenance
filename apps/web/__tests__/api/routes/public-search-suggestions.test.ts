import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ from: vi.fn(() => { throw new Error('Public suggestions must not query user data'); }) }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
import { POST } from '@/app/api/ai/search-suggestions/route';
const request = (body: unknown) => new NextRequest('https://example.test/api/ai/search-suggestions', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
it('returns useful category suggestions without reading searches or job addresses', async () => {
  const response = await POST(request({ query: 'plumb', limit: 3 }), {} as never);
  expect(response.status).toBe(200);
  expect((await response.json()).suggestions).toEqual([{ text: 'plumbing', type: 'category', popularity: 1, relevanceScore: 1 }]);
  expect(mocks.from).not.toHaveBeenCalled();
});
it('does not echo arbitrary addresses or search history', async () => {
  const response = await POST(request({ query: '123 Private Road' }), {} as never);
  expect((await response.json()).suggestions).toEqual([]);
  expect(mocks.from).not.toHaveBeenCalled();
});
it.each([{ query: '' }, { query: 'plumb', limit: 1000 }])('retains input validation: %j', async body => {
  expect((await POST(request(body), {} as never)).status).toBe(400);
});
