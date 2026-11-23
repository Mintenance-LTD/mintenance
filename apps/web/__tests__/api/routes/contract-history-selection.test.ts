import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const fixture = vi.hoisted(() => ({
  actor: { id: 'contractor', role: 'contractor' },
  previousId: '10000000-0000-4000-8000-000000000001',
  unrelatedId: '10000000-0000-4000-8000-000000000002',
  draftId: '10000000-0000-4000-8000-000000000003',
  rows: [
    {
      id: '10000000-0000-4000-8000-000000000001',
      job_id: 'job',
      homeowner_id: 'homeowner',
      contractor_id: 'contractor',
      status: 'cancelled',
      quote_id: 'quote',
    },
    {
      id: 'current',
      job_id: 'job',
      homeowner_id: 'homeowner',
      contractor_id: 'contractor',
      status: 'pending_contractor',
      quote_id: 'quote',
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      job_id: 'job',
      homeowner_id: 'someone-else',
      contractor_id: 'someone-else',
      status: 'cancelled',
      quote_id: 'quote',
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      job_id: 'draft-job',
      homeowner_id: 'homeowner',
      contractor_id: 'another-contractor',
      status: 'draft',
      quote_id: null,
    },
  ],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: NextRequest) =>
      handler(request, {
        user: fixture.actor,
        params: {},
      }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: async (_name: string, args: { p_ids: string[] }) => ({
      error: null,
      data: fixture.rows
        .filter((r) => args.p_ids.includes(r.id))
        .map((r) => ({
          id: r.id,
          snapshot: { contract: r, quote: null, bid: null },
          review_token: 'a'.repeat(32),
        })),
    }),
    from: (table: string) => {
      let rows = table === 'contracts' ? [...fixture.rows] : [];
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
  beforeEach(() => {
    fixture.actor = { id: 'contractor', role: 'contractor' };
  });
  it('returns only the current agreement for job actions even when history comes first', async () => {
    expect(await ids('?job_id=job')).toEqual(['current']);
  });
  it('keeps previous agreements in the participant document list', async () => {
    expect(await ids('')).toEqual([fixture.previousId, 'current']);
  });
  it('allows explicit history selection without exposing another contractor agreement', async () => {
    expect(await ids('?job_id=job&status=cancelled')).toEqual([
      fixture.previousId,
    ]);
  });
  it('returns only the requested agreement for a homeowner and keeps unrelated agreements and drafts out', async () => {
    fixture.actor = { id: 'homeowner', role: 'homeowner' };
    expect(await ids(`?contract_id=${fixture.previousId}`)).toEqual([
      fixture.previousId,
    ]);
    expect(await ids(`?contract_id=${fixture.unrelatedId}`)).toEqual([]);
    expect(await ids(`?contract_id=${fixture.draftId}`)).toEqual([]);
  });
});
