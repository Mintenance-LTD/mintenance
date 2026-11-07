// @vitest-environment node
const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failTable: '',
  push: vi.fn(),
  quiet: null as Date | null,
  muted: false,
  pushEnabled: true,
  inApp: true,
}));
vi.mock('@/lib/api/supabaseServer', async () => {
  const { notificationDatabase } =
    await import('@/lib/services/notifications/__tests__/notificationDatabaseFixture');
  return { serverSupabase: notificationDatabase(state) };
});
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/services/agents/NotificationAgent', () => ({
  NotificationAgent: {},
}));
vi.mock('@/lib/services/notifications/NotificationPushDispatcher', () => ({
  sendPushToDevice: state.push,
}));
vi.mock('@/lib/services/notifications/NotificationPreferenceResolver', () => ({
  loadPreferences: async () => ({
    push_enabled: state.pushEnabled,
    in_app_enabled: state.inApp,
  }),
  isTypeDisabled: () => state.muted,
  nextQuietHoursEndUTC: () => state.quiet,
}));
import { NotificationProcessorService } from '@/lib/services/notifications/NotificationProcessorService';
beforeEach(() => {
  vi.clearAllMocks();
  state.failTable = '';
  state.quiet = null;
  state.muted = false;
  state.pushEnabled = true;
  state.inApp = true;
  state.push.mockResolvedValue({ sent: true });
  state.tables = {
    quote_amendments: [
      {
        id: 'amendment',
        job_id: 'job',
        version: 1,
        status: 'published',
        customer_id: 'payer',
        contractor_id: 'contractor',
      },
    ],
    jobs: [
      {
        id: 'job',
        homeowner_id: 'homeowner',
        payer_user_id: 'payer',
        contractor_id: 'contractor',
      },
    ],
    notification_queue: [
      {
        id: 'notice',
        user_id: 'payer',
        notification_type: 'quote_amendment_update',
        title: 'Review',
        message: 'Review pricing',
        action_url: '/jobs/job/amendments',
        metadata: {
          jobId: 'job',
          quote_amendment_id: 'amendment',
          amendment_version: 1,
        },
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        status: 'pending',
        retry_count: 0,
      },
    ],
    notifications: [],
  };
});
it('delivers one in-app row and a routed push even with competing workers', async () => {
  await Promise.all([
    NotificationProcessorService.processQueuedNotifications(),
    NotificationProcessorService.processQueuedNotifications(),
  ]);
  expect(state.tables.notifications).toHaveLength(1);
  expect(state.tables.notification_queue[0].status).toBe('sent');
  expect(state.push).toHaveBeenCalledTimes(1);
  expect(state.push).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 'payer',
      data: expect.objectContaining({
        type: 'quote_amendment_update',
        jobId: 'job',
        actionUrl: '/jobs/job/amendments',
      }),
    })
  );
});
it.each(['pending', 'failed_push'])(
  'defers %s notices during quiet hours',
  async (status) => {
    state.tables.notification_queue[0].status = status;
    state.quiet = new Date(Date.now() + 3600000);
    await NotificationProcessorService.processQueuedNotifications();
    expect(state.tables.notification_queue[0].scheduled_for).toBe(
      state.quiet.toISOString()
    );
    expect(state.tables.notifications).toHaveLength(0);
    expect(state.push).not.toHaveBeenCalled();
  }
);
it.each(['pending', 'failed_push'])(
  'cancels obsolete %s notices without delivery',
  async (status) => {
    state.tables.notification_queue[0].status = status;
    state.tables.quote_amendments[0].version = 2;
    await NotificationProcessorService.processQueuedNotifications();
    expect(state.tables.notification_queue[0].status).toBe('cancelled');
    expect(state.push).not.toHaveBeenCalled();
    expect(state.tables.notifications).toHaveLength(0);
  }
);
it('respects the per-type mute', async () => {
  state.muted = true;
  await NotificationProcessorService.processQueuedNotifications();
  expect(state.tables.notification_queue[0].status).toBe('cancelled');
  expect(state.push).not.toHaveBeenCalled();
  expect(state.tables.notifications).toHaveLength(0);
});
it('respects independent push and inbox channel choices', async () => {
  state.pushEnabled = false;
  await NotificationProcessorService.processQueuedNotifications();
  expect(state.tables.notifications).toHaveLength(1);
  expect(state.push).not.toHaveBeenCalled();
});
it('supports push-only preference without inventing an inbox row', async () => {
  state.inApp = false;
  await NotificationProcessorService.processQueuedNotifications();
  expect(state.tables.notifications).toHaveLength(0);
  expect(state.push).toHaveBeenCalledTimes(1);
});
it('retries a provider failure without duplicating the inbox notice', async () => {
  state.push.mockResolvedValueOnce({ sent: false, reason: 'expo_unavailable' });
  await NotificationProcessorService.processQueuedNotifications();
  expect(state.tables.notification_queue[0].status).toBe('failed_push');
  state.tables.notification_queue[0].scheduled_for = new Date(
    Date.now() - 1000
  ).toISOString();
  await NotificationProcessorService.processQueuedNotifications();
  expect(state.tables.notifications).toHaveLength(1);
  expect(state.push).toHaveBeenCalledTimes(2);
  expect(state.tables.notification_queue[0].status).toBe('sent');
});
it('retains retryable work and sends nothing when recipient verification fails', async () => {
  state.failTable = 'jobs';
  const result =
    await NotificationProcessorService.processQueuedNotifications();
  expect(result.queuedErrors).toBe(1);
  expect(state.push).not.toHaveBeenCalled();
  expect(state.tables.notification_queue[0].status).toBe('pending');
});
