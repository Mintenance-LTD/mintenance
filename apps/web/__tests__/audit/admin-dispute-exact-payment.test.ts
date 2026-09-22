import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const s = vi.hoisted(() => ({
  filters: vi.fn(),
  error: null as null | { code: string },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, { params: { id: 'fa220922-0000-4000-8000-000000000020' } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: (key: string, value: string) => {
          s.filters(table, key, value);
          return q;
        },
        order: () => q,
        limit: async () => ({ data: [], error: s.error }),
        maybeSingle: async () => ({
          data:
            table === 'escrow_transactions'
              ? { id: 'fa220922-0000-4000-8000-000000000020', job_id: 'job' }
              : null,
          error: null,
        }),
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/admin/disputes/[id]/route';
it('fails closed when the exact payment dispute cannot be loaded', async () => {
  s.error = { code: '08006' };
  await expect(
    GET(new NextRequest('http://localhost/api/admin/disputes/test'), {
      params: Promise.resolve({ id: 'fa220922-0000-4000-8000-000000000020' }),
    })
  ).rejects.toMatchObject({ statusCode: 500 });
  expect(s.filters).toHaveBeenCalledWith(
    'disputes',
    'dispute_escrow_links.escrow_id',
    'fa220922-0000-4000-8000-000000000020'
  );
});
