import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const s = vi.hoisted(() => ({
  actor: 'fa220922-0000-4000-8000-000000000001',
  escrow: 'fa220922-0000-4000-8000-000000000020',
  owner: 'fa220922-0000-4000-8000-000000000001',
  recordError: null as null | { code: string },
  filters: vi.fn(),
  reads: vi.fn(),
  sign: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, {
      user: { id: s.actor, role: 'homeowner' },
      params: { id: s.escrow },
    }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    storage: { from: () => ({ createSignedUrl: s.sign }) },
    from: (table: string) => {
      s.reads(table);
      const q = {
        select: () => q,
        eq: (key: string, value: string) => {
          s.filters(table, key, value);
          return q;
        },
        order: () => q,
        limit: async () => ({
          data: [
            {
              id: 'canonical',
              reason: 'Exact payment reason',
              raised_by: 'claimant',
              description:
                'Claim\n\nEvidence:\n1. job-attachments:job/disputes/claimant/photo.jpg',
            },
          ],
          error: s.recordError,
        }),
        maybeSingle: async () => ({
          data:
            table === 'jobs'
              ? {
                  homeowner_id: s.owner,
                  payer_user_id: 'payer',
                  contractor_id: 'contractor',
                }
              : {
                  id: s.escrow,
                  job_id: 'job',
                  payer_id: 'payer',
                  payee_id: 'contractor',
                  status: 'disputed',
                },
          error: null,
        }),
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/disputes/[id]/route';
const send = () =>
  GET(new NextRequest(`http://localhost/api/disputes/${s.escrow}`), {
    params: Promise.resolve({ id: s.escrow }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  s.owner = s.actor;
  s.recordError = null;
  s.sign.mockResolvedValue({
    data: { signedUrl: 'https://example.test/fresh' },
    error: null,
  });
});
it('lets the current homeowner view a delegated-payment dispute and binds details to its escrow', async () => {
  expect(await (await send()).json()).toMatchObject({
    id: s.escrow,
    dispute_record_id: 'canonical',
    dispute_evidence: [
      { label: 'Evidence 1', url: 'https://example.test/fresh' },
    ],
  });
  expect(s.filters).toHaveBeenCalledWith(
    'disputes',
    'dispute_escrow_links.escrow_id',
    s.escrow
  );
  expect(s.filters).toHaveBeenCalledWith('disputes', 'job_id', 'job');
});
it('denies unrelated users before reading canonical details', async () => {
  s.owner = 'unrelated-owner';
  await expect(send()).rejects.toMatchObject({ statusCode: 403 });
  expect(s.reads).not.toHaveBeenCalledWith('disputes');
  expect(s.sign).not.toHaveBeenCalled();
});
it('does not present a record lookup failure as empty dispute details', async () => {
  s.recordError = { code: '08006' };
  await expect(send()).rejects.toMatchObject({ statusCode: 500 });
});
