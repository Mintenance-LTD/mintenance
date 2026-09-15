import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));
vi.mock('@mintenance/shared', () => ({ logger: { warn: vi.fn() } }));
vi.mock('@/lib/services/payment/PaymentReconciliationService', () => ({
  PaymentReconciliationService: { reconcile: vi.fn() },
}));
import { GET, POST } from '@/app/api/admin/reconciliation/route';
import { PaymentReconciliationService } from '@/lib/services/payment/PaymentReconciliationService';

function chain(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of [
    'select',
    'not',
    'neq',
    'lt',
    'is',
    'or',
    'order',
    'limit',
  ])
    query[method] = () => query;
  query.maybeSingle = async () => result;
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return query;
}
beforeEach(() => vi.clearAllMocks());
const request = () =>
  GET(new NextRequest('http://localhost/api/admin/reconciliation'), {
    params: Promise.resolve({}),
  });

it('reads the actual boolean worker flag without crashing or declaring refunded payments resolved', async () => {
  mocks.from
    .mockReturnValueOnce(
      chain({
        data: [
          {
            id: 'escrow',
            payment_intent_id: 'pi_test',
            amount: 100,
            status: 'refunded',
            metadata: {
              reconciliation_flag: true,
              mismatch_type: 'amount',
              reconciliation_date: '2026-09-15T12:00:00Z',
            },
            updated_at: '2026-09-15T13:00:00Z',
          },
        ],
        error: null,
      })
    )
    .mockReturnValueOnce(chain({ count: 1, error: null }))
    .mockReturnValueOnce(chain({ count: 1, error: null }))
    .mockReturnValueOnce(chain({ count: 1, error: null }))
    .mockReturnValueOnce(chain({ data: null, error: null }));
  const response = await request();
  expect(response.status).toBe(200);
  expect((await response.json()).records[0]).toMatchObject({
    mismatch_type: 'amount',
    resolved: false,
    flagged_at: '2026-09-15T12:00:00Z',
  });
});

it.each(['records', 'count'])(
  'does not disguise a failed %s query as a healthy empty dashboard',
  async (failure) => {
    mocks.from
      .mockReturnValueOnce(
        chain({
          data: [],
          error:
            failure === 'records' ? { message: 'synthetic failure' } : null,
        })
      )
      .mockReturnValueOnce(
        chain({ count: null, error: { message: 'synthetic failure' } })
      )
      .mockReturnValue(
        chain({ count: null, error: { message: 'synthetic failure' } })
      );
    expect((await request()).status).toBe(503);
  }
);

it.each([0, 1])(
  'manual execution reports worker errors=%s truthfully',
  async (errors) => {
    vi.mocked(PaymentReconciliationService.reconcile).mockResolvedValue({
      checked: 1,
      matched: errors ? 0 : 1,
      mismatched: 0,
      missingInStripe: 0,
      errors,
    });
    const response = await POST(
      new NextRequest('http://localhost/api/admin/reconciliation', {
        method: 'POST',
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(errors ? 503 : 200);
    expect((await response.json()).checked).toBe(1);
  }
);

it('reaches all 105 unresolved payments despite 100 newer resolved records', async () => {
  const rows = Array.from({ length: 205 }, (_, index) => ({
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    payment_intent_id: 'pi_synthetic',
    amount: 100,
    status: 'refunded',
    created_at: '2026-09-01T00:00:00.123456+00:00',
    updated_at: '2026-09-15T00:00:00Z',
    metadata: { reconciliation_flag: index < 105, mismatch_type: 'amount' },
  }));
  mocks.from.mockImplementation((table: string) => {
    if (table === 'payment_reconciliation_runs')
      return chain({ data: null, error: null });
    let unresolved = false;
    let limit = 1000;
    let before: string | null = null;
    let count = false;
    const q: Record<string, unknown> = {};
    q.select = (_columns: string, options?: { head: boolean }) => {
      count = !!options?.head;
      return q;
    };
    q.not = q.order = () => q;
    q.neq = () => {
      unresolved = true;
      return q;
    };
    q.limit = (value: number) => {
      limit = value;
      return q;
    };
    q.or = (value: string) => {
      before = value.match(/id.lt.([0-9a-f-]+)/)![1];
      return q;
    };
    q.then = (resolve: (value: unknown) => unknown) => {
      const filtered = rows
        .filter(
          (row) =>
            (!unresolved || row.metadata.reconciliation_flag) &&
            (!before || row.id < before)
        )
        .sort((a, b) => b.id.localeCompare(a.id));
      return Promise.resolve({
        data: count ? null : filtered.slice(0, limit),
        count: filtered.length,
        error: null,
      }).then(resolve);
    };
    return q;
  });
  const ids: string[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 3; page++) {
    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/reconciliation?filter=unresolved${cursor ? `&cursor=${cursor}` : ''}`
      ),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    ids.push(...body.records.map((row: { id: string }) => row.id));
    expect(body.stats.unresolved_count).toBe(105);
    cursor = body.pagination.next_cursor;
  }
  expect(ids).toHaveLength(105);
  expect(new Set(ids).size).toBe(105);
  expect(cursor).toBeNull();
  expect(ids).toContain(rows[0].id);
});

it.each([
  'filter=invalid',
  'cursor=!',
  `cursor=${Buffer.from(JSON.stringify({ id: 'injection),id.gt.0', createdAt: null })).toString('base64url')}`,
])('rejects malformed navigation before database access: %s', async (query) => {
  const response = await GET(
    new NextRequest(`http://localhost/api/admin/reconciliation?${query}`),
    { params: Promise.resolve({}) }
  );
  expect(response.status).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});
