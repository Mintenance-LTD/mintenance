import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const fixture = vi.hoisted(() => ({
  rows: [
    {
      id: 'previous',
      job_id: 'job',
      contractor_id: 'contractor',
      status: 'cancelled',
      quote_id: 'quote',
    },
    {
      id: 'current',
      job_id: 'job',
      contractor_id: 'contractor',
      status: 'pending_contractor',
      quote_id: 'quote',
    },
    {
      id: 'other-person',
      job_id: 'job',
      contractor_id: 'someone-else',
      status: 'cancelled',
      quote_id: 'quote',
    },
  ],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: NextRequest) =>
      handler(request, {
        user: { id: 'contractor', role: 'contractor' },
        params: {},
      }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      let rows = [...fixture.rows];
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          rows = rows.filter((row) => row[key as keyof typeof row] === value);
          return query;
        },
        neq: (key: string, value: string) => {
          rows = rows.filter((row) => row[key as keyof typeof row] !== value);
          return query;
        },
        order: () => query,
        then: (resolve: Function) => resolve({ data: rows, error: null }),
      };
      return query;
    },
  },
}));
import { GET } from '@/app/api/contracts/route';

async function ids(search: string) {
  const response = await GET(
    new NextRequest(`http://localhost/api/contracts${search}`),
    {
      params: Promise.resolve({}),
    }
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  return body.contracts.map((row: { id: string }) => row.id);
}
describe('contract history selection at the API boundary', () => {
  it('returns only the current agreement for job actions even when history comes first', async () => {
    expect(await ids('?job_id=job')).toEqual(['current']);
  });
  it('keeps previous agreements in the participant document list', async () => {
    expect(await ids('')).toEqual(['previous', 'current']);
  });
  it('allows explicit history selection without exposing another contractor agreement', async () => {
    expect(await ids('?job_id=job&status=cancelled')).toEqual(['previous']);
  });
});
