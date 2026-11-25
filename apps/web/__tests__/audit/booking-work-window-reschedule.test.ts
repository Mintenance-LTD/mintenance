import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/bookings/[id]/reschedule/route';

const mocks = vi.hoisted(() => ({ from: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: mocks.notify },
}));

const job = {
  id: 'job',
  title: 'Test repair',
  homeowner_id: 'owner',
  payer_user_id: 'owner',
  contractor_id: 'contractor',
  status: 'assigned',
  scheduled_start_date: '2099-07-01T08:00:00+00:00',
  scheduled_end_date: '2099-07-02T15:00:00+00:00',
};
const newDateTime = '2099-07-08T10:00:00.000Z';
const request = () =>
  new NextRequest('http://localhost/api/bookings/job/reschedule', {
    method: 'PATCH',
    body: JSON.stringify({ newDateTime }),
  });
const context = {
  user: { id: 'owner', role: 'homeowner' },
  params: { id: 'job' },
} as never;

function mockBookingUpdate(
  end: string | null,
  compareAndSwapSucceeded: boolean
) {
  const out = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({ data: { ...job, scheduled_end_date: end } }),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: compareAndSwapSucceeded ? { id: job.id } : null,
      error: null,
    }),
    neq: vi.fn().mockResolvedValue({ data: [] }),
  };
  mocks.from.mockReturnValue(out);
  return out;
}

beforeEach(() => vi.clearAllMocks());

it('moves both ends together and retains the existing work-window duration', async () => {
  const query = mockBookingUpdate(job.scheduled_end_date, true);
  const response = await PATCH(request(), context);
  expect(response.status).toBe(200);
  expect(query.update).toHaveBeenCalledWith(
    expect.objectContaining({
      scheduled_start_date: newDateTime,
      scheduled_end_date: '2099-07-09T17:00:00.000Z',
    })
  );
  expect(query.eq).toHaveBeenCalledWith(
    'scheduled_end_date',
    job.scheduled_end_date
  );
});

it('rejects a stale reschedule before syncing visits or sending an alert', async () => {
  mockBookingUpdate(job.scheduled_end_date, false);
  await expect(PATCH(request(), context)).rejects.toThrow(
    'The work window changed'
  );
  expect(mocks.from).not.toHaveBeenCalledWith('appointments');
  expect(mocks.notify).not.toHaveBeenCalled();
});

it('omits the end when the previous window had invalid dates on explicit reschedule', async () => {
  const query = mockBookingUpdate('2099-06-30T08:00:00Z', true);
  await PATCH(request(), context);
  expect(query.update).toHaveBeenCalledWith(
    expect.objectContaining({
      scheduled_start_date: newDateTime,
      scheduled_end_date: null,
    })
  );
});
