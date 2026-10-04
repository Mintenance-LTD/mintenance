import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ from: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: m.notify },
}));
// These tests exercise route business rules; middleware authentication is tested separately.
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: NextRequest) =>
    handler(request, { user: { id: 'contractor' } }),
}));
import { POST } from '@/app/api/contractor/trips/route';
const jobId = '11111111-1111-4111-8111-111111111111';
const job = {
  id: jobId,
  contractor_id: 'contractor',
  homeowner_id: 'owner',
  status: 'assigned',
};
let funding: unknown;
let fundingError: unknown;
let assignedJob: typeof job;
let trip: unknown;
let insert: ReturnType<typeof vi.fn>;
function builder(data: unknown, error: unknown = null) {
  const b: Record<string, any> = {};
  for (const name of ['select', 'eq', 'order', 'limit', 'update', 'is'])
    b[name] = vi.fn(() => b);
  b.single = b.maybeSingle = vi.fn(async () => ({ data, error }));
  b.insert = insert;
  return b;
}
beforeEach(() => {
  vi.clearAllMocks();
  funding = { id: 'escrow' };
  fundingError = null;
  assignedJob = job;
  trip = { id: 'trip', job_id: jobId, destination_lat: 51, destination_lng: 0 };
  insert = vi.fn(() => {
    throw new Error('unexpected insert');
  });
  m.from.mockImplementation((table: string) =>
    builder(
      table === 'jobs'
        ? assignedJob
        : table === 'escrow_transactions'
          ? funding
          : trip,
      table === 'escrow_transactions' ? fundingError : null
    )
  );
});
const request = () =>
  new NextRequest('https://example.test/api/contractor/trips', {
    method: 'POST',
    body: JSON.stringify({ jobId }),
    headers: { 'Content-Type': 'application/json' },
  });
it('refuses departure before confirmed funding, without a trip or notification', async () => {
  funding = null;
  await expect(POST(request(), {} as never)).rejects.toThrow(
    'Payment must be confirmed'
  );
  expect(insert).not.toHaveBeenCalled();
  expect(m.notify).not.toHaveBeenCalled();
});
it('fails closed when the funding lookup fails', async () => {
  fundingError = new Error('database unavailable');
  await expect(POST(request(), {} as never)).rejects.toThrow(
    'database unavailable'
  );
  expect(insert).not.toHaveBeenCalled();
});
it('refuses another contractor before reading funding', async () => {
  assignedJob = { ...job, contractor_id: 'someone-else' };
  await expect(POST(request(), {} as never)).rejects.toThrow('Not assigned');
  expect(m.from).not.toHaveBeenCalledWith('escrow_transactions');
});
it('reuses the same funded trip on retry without another notification', async () => {
  const response = await POST(request(), {} as never);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ trip });
  expect(insert).not.toHaveBeenCalled();
  expect(m.notify).not.toHaveBeenCalled();
});

it('creates a funded trip and notifies the homeowner only after insertion', async () => {
  trip = null;
  const created = { id: 'new-trip', job_id: jobId, status: 'en_route' };
  insert.mockImplementation(() => builder(created));
  const response = await POST(request(), {} as never);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ trip: created });
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      contractor_id: 'contractor',
      job_id: jobId,
      status: 'en_route',
    })
  );
  expect(m.notify).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'owner', type: 'contractor_en_route' })
  );
});

for (const scenario of [
  {
    title: 'expires a previous-day trip despite a refreshed GPS row',
    tripHours: 48,
    locationMinutes: 0,
    allowed: true,
  },
  {
    title: 'recovers an old trip with a stale active GPS flag',
    tripHours: 1,
    locationMinutes: 30,
    allowed: true,
  },
  {
    title: 'keeps a recent journey with fresh GPS active',
    tripHours: 1,
    locationMinutes: 0,
    allowed: false,
  },
]) {
  it(scenario.title, async () => {
    const oldTrip = {
      id: 'old',
      job_id: 'other',
      started_at: new Date(
        Date.now() - scenario.tripHours * 3600000
      ).toISOString(),
    };
    const update = vi.fn();
    const created = { id: 'new', job_id: jobId };
    insert.mockImplementation(() => builder(created));
    m.from.mockImplementation((table: string) => {
      const b = builder(
        table === 'jobs'
          ? assignedJob
          : table === 'escrow_transactions'
            ? funding
            : table === 'contractor_locations'
              ? {
                  id: 'loc',
                  location_timestamp: new Date(
                    Date.now() - scenario.locationMinutes * 60000
                  ).toISOString(),
                }
              : oldTrip
      );
      b.update = vi.fn((value) => {
        update(value);
        return b;
      });
      b.then = (resolve: Function) =>
        Promise.resolve({ data: null, error: null }).then(resolve as never);
      return b;
    });
    if (scenario.allowed) {
      expect((await POST(request(), {} as never)).status).toBe(201);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      );
    } else {
      await expect(POST(request(), {} as never)).rejects.toThrow(
        'already have an active trip'
      );
      expect(insert).not.toHaveBeenCalled();
    }
  });
}
