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
  for (const method of ['select', 'not', 'order', 'limit'])
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
