import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  job: {} as any,
  call: null as any,
  insertError: null as any,
  rows: [] as any[],
  enqueue: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({
          data: table === 'jobs' ? state.job : state.call,
          error: null,
        }),
        insert: async (row: any) => {
          state.rows.push(row);
          return { error: state.insertError };
        },
      };
      return q;
    },
  },
}));
vi.mock('../NotificationService', () => ({
  NotificationService: { enqueueScheduled: state.enqueue },
}));
import { schedulePhoneCall, shouldDeliverPhoneCall } from '../PhoneCallService';
const input = {
  requestId: 'call',
  jobId: 'job',
  otherUserId: 'customer',
  scheduledTime: new Date(Date.now() + 3600000).toISOString(),
  purpose: 'consultation' as const,
};
beforeEach(() => {
  state.job = {
    id: 'job',
    title: 'Repair',
    homeowner_id: 'customer',
    payer_user_id: 'payer',
    contractor_id: 'contractor',
    status: 'in_progress',
    archived_at: null,
  };
  state.call = null;
  state.insertError = null;
  state.rows = [];
  state.enqueue.mockReset();
  state.enqueue.mockResolvedValue(undefined);
});
describe('phone call scheduling', () => {
  it('stores the real call columns and queues an arrangement and timed reminder for each person', async () => {
    await schedulePhoneCall('contractor', input);
    expect(state.rows[0]).toMatchObject({
      participant_id: 'customer',
      scheduled_at: input.scheduledTime,
      metadata: { channel: 'phone' },
    });
    expect(state.rows[0]).not.toHaveProperty('participants');
    expect(state.enqueue).toHaveBeenCalledTimes(4);
    const reminders = state.enqueue.mock.calls
      .map(([row]) => row)
      .filter((row) => row.metadata.kind === 'reminder');
    expect(reminders.map((row) => row.userId)).toEqual([
      'contractor',
      'customer',
    ]);
    expect(
      reminders.every(
        (row) => row.scheduledFor.toISOString() === input.scheduledTime
      )
    ).toBe(true);
    expect(new Set(state.enqueue.mock.calls.map(([row]) => row.id)).size).toBe(
      4
    );
  });
  it.each(['stranger', 'payer'])(
    'rejects an unrelated caller or customer-to-customer arrangement: %s',
    async (user) => {
      await expect(schedulePhoneCall(user, input)).rejects.toThrow();
      expect(state.rows).toHaveLength(0);
    }
  );
  it('allows the designated payer to arrange with the assigned contractor', async () => {
    await schedulePhoneCall('payer', { ...input, otherUserId: 'contractor' });
    expect(state.enqueue).toHaveBeenCalledTimes(4);
  });
  it.each(['draft', 'cancelled', 'archived'])(
    'rejects %s jobs',
    async (status) => {
      state.job.status = status;
      await expect(schedulePhoneCall('contractor', input)).rejects.toThrow();
    }
  );
  it('rejects archived jobs even when their status remains active', async () => {
    state.job.archived_at = new Date().toISOString();
    await expect(schedulePhoneCall('contractor', input)).rejects.toThrow();
  });
  it('propagates enqueue failures and safely retries using the same reminder IDs', async () => {
    state.enqueue.mockRejectedValueOnce(new Error('offline'));
    await expect(schedulePhoneCall('contractor', input)).rejects.toThrow(
      'offline'
    );
    const firstId = state.enqueue.mock.calls[0][0].id;
    state.call = state.rows[0];
    state.insertError = { code: '23505' };
    await schedulePhoneCall('contractor', input);
    expect(state.enqueue.mock.calls[1][0].id).toBe(firstId);
  });
  it('does not allow another caller to reuse a saved request', async () => {
    state.insertError = { code: '23505' };
    state.call = { initiator_id: 'stranger' };
    await expect(schedulePhoneCall('contractor', input)).rejects.toThrow();
    expect(state.enqueue).not.toHaveBeenCalled();
  });
  it('rejects past dates', async () => {
    await expect(
      schedulePhoneCall('contractor', {
        ...input,
        scheduledTime: '2020-01-01T00:00:00Z',
      })
    ).rejects.toThrow();
  });
});
describe('reminder delivery guard', () => {
  const metadata = {
    phone_call_id: 'call',
    scheduled_time: input.scheduledTime,
  };
  beforeEach(() => {
    state.call = {
      job_id: 'job',
      initiator_id: 'contractor',
      participant_id: 'customer',
      scheduled_at: input.scheduledTime,
      status: 'scheduled',
      metadata: { channel: 'phone' },
    };
  });
  it('allows an unchanged arrangement', async () => {
    expect(await shouldDeliverPhoneCall(metadata, 'customer')).toBe(true);
  });
  it('suppresses cancelled calls', async () => {
    state.call.status = 'cancelled';
    expect(await shouldDeliverPhoneCall(metadata, 'customer')).toBe(false);
  });
  it('suppresses reminders for a changed schedule', async () => {
    state.call.scheduled_at = new Date(Date.now() + 7200000).toISOString();
    expect(await shouldDeliverPhoneCall(metadata, 'customer')).toBe(false);
  });
  it('suppresses reminders after a contractor is replaced', async () => {
    state.job.contractor_id = 'new';
    expect(await shouldDeliverPhoneCall(metadata, 'customer')).toBe(false);
  });
  it('does not affect unrelated notifications', async () => {
    expect(await shouldDeliverPhoneCall({}, 'customer')).toBe(true);
  });
});
