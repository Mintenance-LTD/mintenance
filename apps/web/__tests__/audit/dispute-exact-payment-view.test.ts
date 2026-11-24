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
  historyError: null as null | { code: string },
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
        gte: (key: string, value: string) => {
          s.filters(table, key, value);
          return q;
        },
        lte: () => q,
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve(
            table === 'audit_logs'
              ? {
                  data: [
                    {
                      id: 'scheduled',
                      created_at: '2026-11-22T09:00:00Z',
                      new_values: {
                        scheduledAt: '2026-11-25T09:00:00Z',
                        mediatorId: 'internal-id',
                      },
                    },
                  ],
                }
              : {
                  data: s.historyError
                    ? null
                    : [
                        {
                          id: 1,
                          status: 'under_review',
                          changed_at: '2026-11-21T14:00:00Z',
                        },
                      ],
                  error: s.historyError,
                }
          ).then(resolve),
        limit: async () => ({
          data: [
            {
              id: 'canonical',
              reason: 'Exact payment reason',
              created_at: '2026-11-20T14:00:00Z',
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
  s.historyError = null;
  s.sign.mockResolvedValue({
    data: { signedUrl: 'https://example.test/fresh' },
    error: null,
  });
});
it('lets the current homeowner view a delegated-payment dispute and binds details to its escrow', async () => {
  const body = await (await send()).json();
  expect(body).toMatchObject({
    id: s.escrow,
    dispute_record_id: 'canonical',
    dispute_evidence: [
      { label: 'Evidence 1', url: 'https://example.test/fresh' },
    ],
    history: [
      {
        title: 'Original statement',
        reason: 'Exact payment reason',
        description: 'Claim',
        at: '2026-11-20T14:00:00Z',
      },
      {
        title: 'Evidence submitted with the dispute',
        evidence: true,
        at: '2026-11-20T14:00:00Z',
      },
      { title: 'Dispute moved to review', at: '2026-11-21T14:00:00Z' },
      { title: 'Mediation scheduled', at: '2026-11-22T09:00:00Z' },
    ],
  });
  expect(JSON.stringify(body)).not.toContain('internal-id');
  expect(JSON.stringify(body)).not.toContain('job-attachments:');
  expect(s.filters).toHaveBeenCalledWith(
    'disputes',
    'dispute_escrow_links.escrow_id',
    s.escrow
  );
  expect(s.filters).toHaveBeenCalledWith('disputes', 'job_id', 'job');
  expect(s.filters).toHaveBeenCalledWith(
    'dispute_case_status_history',
    'dispute_id',
    'canonical'
  );
  expect(s.filters).toHaveBeenCalledWith('audit_logs', 'record_id', s.escrow);
});
it('denies unrelated users before reading canonical details', async () => {
  s.owner = 'unrelated-owner';
  await expect(send()).rejects.toMatchObject({ statusCode: 403 });
  expect(s.reads).not.toHaveBeenCalledWith('disputes');
  expect(s.reads).not.toHaveBeenCalledWith('dispute_case_status_history');
  expect(s.reads).not.toHaveBeenCalledWith('audit_logs');
  expect(s.sign).not.toHaveBeenCalled();
});
it('preserves the filing and flags incomplete status history if its lookup fails', async () => {
  s.historyError = { code: '08006' };
  const body = await (await send()).json();
  expect(body.history_incomplete).toBe(true);
  expect(body.history[0]).toMatchObject({
    title: 'Original statement',
    description: 'Claim',
  });
});
it('does not present a record lookup failure as empty dispute details', async () => {
  s.recordError = { code: '08006' };
  await expect(send()).rejects.toMatchObject({ statusCode: 500 });
});
