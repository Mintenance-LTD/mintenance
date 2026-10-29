// @vitest-environment node
const m = vi.hoisted(() => ({ from: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: m.notify },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_name: string, handler: unknown) => handler,
}));
import { AdminAlertService } from '@/lib/services/admin/AdminAlertService';
import { GET } from '@/app/api/cron/admin-alerts/route';
import { NextRequest } from 'next/server';

const escrowId = '11111111-1111-4111-8111-111111111111';
type Row = Record<string, any>;
let rows: Record<string, Row[]>;
let failures: Set<string>;
let existing: Set<string>;
let queued: Set<string>;
let queries: Array<{ table: string; filters: Array<[string, string, any]> }>;

beforeEach(() => {
  vi.clearAllMocks();
  failures = new Set();
  existing = new Set();
  queued = new Set();
  queries = [];
  rows = {
    escrow_transactions: [
      {
        id: escrowId,
        job_id: 'job-1',
        amount: 120,
        status: 'held',
        created_at: '2026-01-01',
      },
    ],
    profiles: [
      { id: 'admin-1', role: 'admin' },
      { id: 'admin-2', role: 'admin' },
    ],
    jobs: [],
    payment_attempts: [],
  };
  m.notify.mockResolvedValue('notification-id');
  m.from.mockImplementation((table: string) => {
    const filters: Array<[string, string, any]> = [];
    const q: Record<string, any> = {};
    for (const method of [
      'select',
      'eq',
      'neq',
      'is',
      'gte',
      'lte',
      'limit',
      'order',
      'or',
      'in',
    ]) {
      q[method] = vi.fn((field: string, value: any) => {
        filters.push([method, field, value]);
        return q;
      });
    }
    q.then = (resolve: (result: unknown) => unknown) => {
      queries.push({ table, filters });
      if (failures.has(table))
        return Promise.resolve(
          resolve({ data: null, error: { message: 'database unavailable' } })
        );
      const userId = filters.find(
        ([op, key]) => op === 'eq' && key === 'user_id'
      )?.[2];
      if (table === 'notifications' || table === 'notification_queue') {
        const found = (table === 'notifications' ? existing : queued).has(
          userId
        );
        return Promise.resolve(
          resolve({ data: found ? [{ id: 'existing' }] : [], error: null })
        );
      }
      let data = rows[table] || [];
      for (const [op, key, value] of filters) {
        if (op === 'eq') data = data.filter((r) => r[key] === value);
        if (op === 'gte' && key === 'amount')
          data = data.filter((r) => r.amount >= value);
      }
      // Old held fixture belongs only to the overdue query, not last-day payments.
      if (
        table === 'escrow_transactions' &&
        filters.some(([op, key]) => op === 'gte' && key === 'created_at')
      ) {
        data = data.filter((r) => r.created_at === 'recent');
      }
      return Promise.resolve(resolve({ data, error: null }));
    };
    return q;
  });
});

it('persists short types with entity keys and displays pounds without dividing by 100', async () => {
  const result = await AdminAlertService.generateAlerts();
  expect(result).toMatchObject({ created: 2, failed: 0, suppressed: 0 });
  expect(m.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'overdue_escrow',
      throwOnError: true,
      message: expect.stringContaining('£120.00'),
      metadata: expect.objectContaining({
        adminAlertKey: `overdue_escrow_${escrowId}`,
        escrowId,
      }),
    })
  );
  expect(m.notify.mock.calls.every(([p]) => p.type.length <= 50)).toBe(true);
});

it('selects the £5,000 boundary and excludes £4,999.99', async () => {
  rows.escrow_transactions = [4999.99, 5000, 5000.01].map((amount, i) => ({
    id: `payment-${i}`,
    amount,
    status: 'completed',
    created_at: 'recent',
  }));
  const result = await AdminAlertService.generateAlerts();
  expect(result.created).toBe(4);
  expect(result.alerts.map((a) => a.title)).toEqual([
    'High-Value Payment: £5,000.00',
    'High-Value Payment: £5,000.01',
  ]);
});

it('uses pounds for failed payment attempts too', async () => {
  rows.escrow_transactions = [];
  rows.payment_attempts = Array.from({ length: 4 }, (_, id) => ({
    id,
    user_id: 'payer-1',
    amount: '120.00',
    status: 'failed',
  }));
  const result = await AdminAlertService.generateAlerts();
  expect(result.alerts[0]).toMatchObject({
    type: 'failed_payments',
    message: expect.stringContaining('£480.00'),
  });
});

it('retries a missing recipient without duplicating the recipient who already received the alert', async () => {
  existing.add('admin-1');
  m.notify.mockRejectedValueOnce(new Error('notification_insert_failed'));
  expect(await AdminAlertService.generateAlerts()).toMatchObject({
    created: 0,
    skipped: 1,
    failed: 1,
  });
  expect(m.notify).toHaveBeenCalledTimes(1);
  expect(m.notify.mock.calls[0][0].userId).toBe('admin-2');
  expect(await AdminAlertService.generateAlerts()).toMatchObject({
    created: 1,
    skipped: 1,
    failed: 0,
  });
  expect(
    queries
      .filter((q) => q.table === 'notifications')
      .every((q) => q.filters.some((f) => f[1] === 'user_id'))
  ).toBe(true);
});

it('deduplicates deferred notifications and reports preferences separately from persistence failures', async () => {
  queued.add('admin-1');
  m.notify.mockResolvedValue(null);
  expect(await AdminAlertService.generateAlerts()).toMatchObject({
    created: 0,
    skipped: 1,
    suppressed: 1,
    failed: 0,
  });
});

it('reports failed checks instead of returning a green empty result', async () => {
  failures.add('escrow_transactions');
  expect(await AdminAlertService.generateAlerts()).toMatchObject({
    created: 0,
    failed: 2,
  });
});

it('fails delivery when no admin can receive generated alerts', async () => {
  rows.profiles = [];
  expect(await AdminAlertService.generateAlerts()).toMatchObject({
    created: 0,
    failed: 1,
  });
});

it('surfaces recipient failures to the cron wrapper using its failed counter', async () => {
  m.notify.mockRejectedValue(new Error('notification_insert_failed'));
  expect(
    await GET(new NextRequest('http://localhost/api/cron/admin-alerts'))
  ).toMatchObject({ created: 0, failed: 2 });
});
