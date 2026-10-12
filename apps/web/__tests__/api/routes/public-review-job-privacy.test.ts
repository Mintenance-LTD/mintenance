import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: () => {
  const chain = {
    select: mocks.select,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data: [{
      id: 'review', rating: 5, comment: 'Good work', created_at: '2026-10-01',
      reviewer: { first_name: 'Test' },
      job: { category: null, title: 'Repair at 17 Private Road' },
      response: 'Unpublished reply', response_published_at: null,
    }], error: null }),
  };
  mocks.select.mockReturnValue(chain);
  return chain;
} } }));
import { GET } from '@/app/api/contractors/[id]/reviews/route';
it('never uses private job titles when the public category is missing', async () => {
  const response = await GET({} as never, { params: { id: 'contractor' } } as never);
  const body = await response.json();
  expect(body.reviews[0].jobType).toBe('General Work');
  expect(JSON.stringify(body)).not.toContain('Private Road');
  expect(body.reviews[0].response).toBeNull();
  expect(mocks.select.mock.calls[0][0]).not.toMatch(/\btitle\b/);
});
