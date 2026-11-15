import { NextRequest } from 'next/server';
import { POST } from '@/app/api/jobs/[id]/schedule/route';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  notify: vi.fn(),
  update: vi.fn(),
  filters: vi.fn(),
  status: 'assigned',
  agreement: true,
  saved: true,
  end: null as string | null,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: m.notify },
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.status = 'assigned';
  m.agreement = true;
  m.saved = true;
  m.end = null;
  m.from.mockImplementation((table) => {
    const q = {
      select: vi.fn().mockReturnThis(),
      eq: (...args: unknown[]) => {
        m.filters(...args);
        return q;
      },
      not: vi.fn().mockReturnThis(),
      update: (data: unknown) => {
        m.update(data);
        return q;
      },
      single: async () => ({
        data: {
          id: 'job',
          title: 'Repair',
          homeowner_id: 'homeowner',
          payer_user_id: 'payer',
          contractor_id: 'contractor',
          status: m.status,
          scheduled_end_date: m.end,
          updated_at: 'version',
        },
        error: null,
      }),
      maybeSingle: async () => ({
        data: (table === 'contracts' ? m.agreement : m.saved)
          ? { id: 'saved' }
          : null,
        error: null,
      }),
    };
    return q;
  });
});
const body = {
  scheduled_start_date: '2099-11-16T09:00:00Z',
  scheduled_end_date: '2099-11-17T09:00:00Z',
};
const request = (data: unknown = body) =>
  new NextRequest('http://localhost/api/jobs/job/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
const context = (role: string, id = role) => ({
  user: { role, id },
  params: { id: 'job' },
});
it.each(['homeowner', 'contractor'])(
  'saves the job window and notifies both parties as %s without rewriting signed dates or visits',
  async (role) => {
    const response = await POST(request(), context(role) as never);
    expect(response.status).toBe(200);
    expect(m.update).toHaveBeenCalledOnce();
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining(body));
    expect(m.filters).toHaveBeenCalledWith('updated_at', 'version');
    expect(m.filters).toHaveBeenCalledWith('status', 'assigned');
    expect(m.notify).toHaveBeenCalledTimes(2);
    expect(m.notify.mock.calls.map((call) => call[0].userId).sort()).toEqual([
      'contractor',
      'homeowner',
    ]);
    expect(m.from.mock.calls.map((call) => call[0])).not.toContain(
      'appointments'
    );
  }
);
it('rejects unrelated users before any mutation', async () => {
  await expect(
    POST(request(), context('contractor', 'stranger') as never)
  ).rejects.toThrow('Not authorized');
  expect(m.update).not.toHaveBeenCalled();
});
it.each(['completed', 'cancelled', 'posted'])(
  'rejects scheduling a %s job',
  async (status) => {
    m.status = status;
    await expect(
      POST(request(), context('homeowner') as never)
    ).rejects.toThrow('Only active assigned');
    expect(m.update).not.toHaveBeenCalled();
  }
);
it('requires both signatures', async () => {
  m.agreement = false;
  await expect(POST(request(), context('contractor') as never)).rejects.toThrow(
    'Both parties must sign'
  );
  expect(m.update).not.toHaveBeenCalled();
});
it('rejects a lost update without sending success notifications', async () => {
  m.saved = false;
  await expect(POST(request(), context('homeowner') as never)).rejects.toThrow(
    'job changed'
  );
  expect(m.notify).not.toHaveBeenCalled();
});
it('validates an existing end date when the client omits it', async () => {
  m.end = '2099-11-15T09:00:00Z';
  await expect(
    POST(
      request({ scheduled_start_date: body.scheduled_start_date }),
      context('homeowner') as never
    )
  ).rejects.toThrow('End time');
  expect(m.update).not.toHaveBeenCalled();
});
