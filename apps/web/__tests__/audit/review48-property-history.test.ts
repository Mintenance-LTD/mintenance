import { NextRequest } from 'next/server';
import { GET } from '@/app/api/properties/[id]/activity/route';
const m = vi.hoisted(() => ({
  access: vi.fn(),
  from: vi.fn(),
  calls: [] as { table: string; operation: string; args: unknown[] }[],
  fail: '',
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/services/property-team/property-management-access', () => ({
  getPropertyForManagement: m.access,
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.calls = [];
  m.fail = '';
  m.access.mockResolvedValue({ owner_id: 'owner' });
  m.from.mockImplementation((table) => {
    let date = 'created_at';
    const q: Record<string, unknown> = {};
    for (const operation of ['select', 'eq', 'not', 'or', 'order', 'limit'])
      q[operation] = (...args: unknown[]) => {
        m.calls.push({ table, operation, args });
        if (operation === 'order' && args[0] !== 'id') date = String(args[0]);
        return q;
      };
    q.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        error: m.fail === table ? { message: 'unavailable' } : null,
        data:
          table === 'jobs'
            ? [
                {
                  id: 'job',
                  title: 'Boiler',
                  created_at: '2026-10-01',
                  completed_at: '2026-11-14',
                },
              ]
            : table === 'property_document_files'
              ? [{ id: 'doc', name: 'Manual', created_at: '2026-11-13' }]
              : table === 'property_inspection_reports'
                ? [
                    {
                      id: 'inspection',
                      title: 'Annual check',
                      created_at: '2026-11-12',
                    },
                  ]
                : table === 'escrow_transactions'
                  ? date === 'released_at'
                    ? [
                        {
                          id: 'old-payment',
                          job_id: 'job',
                          created_at: '2025-01-01',
                          funded_at: '2025-01-02',
                          released_at: '2026-11-15',
                        },
                      ]
                    : []
                  : [
                      {
                        id: 'message',
                        job_id: 'job',
                        created_at: '2026-11-14',
                      },
                    ],
      }).then(resolve);
    return q;
  });
});
const request = (offset = '0') =>
  new NextRequest(
    `http://localhost/api/properties/property/activity?offset=${offset}`
  );
const context = {
  user: { id: 'owner', role: 'homeowner' },
  params: { id: 'property' },
};
it('includes all recorded sources and sorts a recent release of an old payment first', async () => {
  const response = await GET(request(), context as never);
  const body = await response.json();
  expect(body.events[0]).toMatchObject({
    id: 'released-old-payment',
    href: '/payments?paymentId=old-payment',
  });
  expect(
    new Set(body.events.map((event: { kind: string }) => event.kind))
  ).toEqual(new Set(['job', 'document', 'inspection', 'payment', 'message']));
  expect(
    body.events.filter(
      (event: { id: string }) => event.id === 'payment-old-payment'
    )
  ).toHaveLength(1);
  expect(m.calls).toContainEqual({
    table: 'messages',
    operation: 'or',
    args: ['sender_id.eq.owner,receiver_id.eq.owner'],
  });
  expect(m.calls).toContainEqual({
    table: 'escrow_transactions',
    operation: 'eq',
    args: ['payer_id', 'owner'],
  });
  expect(m.calls).toContainEqual({
    table: 'messages',
    operation: 'eq',
    args: ['job.property_id', 'property'],
  });
  expect(
    m.calls.find(
      (call) => call.table === 'messages' && call.operation === 'select'
    )?.args[0]
  ).not.toContain('content');
});
it('does not expose financial or conversation metadata to a property team viewer', async () => {
  m.access.mockResolvedValue({ owner_id: 'someone-else' });
  await expect(GET(request(), context as never)).rejects.toThrow(
    'Only the property owner'
  );
  expect(m.from).not.toHaveBeenCalled();
});
it('reports a missing source rather than presenting a partial history as complete', async () => {
  m.fail = 'property_document_files';
  await expect(GET(request(), context as never)).rejects.toThrow(
    'complete property history'
  );
});
it('rejects invalid pagination before loading data', async () => {
  await expect(GET(request('-1'), context as never)).rejects.toThrow(
    'Invalid activity page'
  );
  expect(m.from).not.toHaveBeenCalled();
});
