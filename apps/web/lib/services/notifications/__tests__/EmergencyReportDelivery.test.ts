const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failTable: '',
  rpc: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', async () => {
  const { notificationDatabase } =
    await import('./notificationDatabaseFixture');
  return { serverSupabase: { ...notificationDatabase(state), rpc: state.rpc } };
});
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../agents/NotificationAgent', () => ({ NotificationAgent: {} }));
vi.mock('../NotificationPushDispatcher', () => ({
  sendPushToDevice: state.push,
}));
import { NotificationProcessorService } from '../NotificationProcessorService';
import {
  loadPreferences,
  nextQuietHoursEndUTC,
} from '../NotificationPreferenceResolver';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-23T23:00:00Z'));
  state.failTable = '';
  state.rpc.mockResolvedValue({ data: true, error: null });
  state.push.mockResolvedValue({ sent: true, acceptedDeviceIds: ['device'] });
  state.tables = {
    notification_queue: [
      {
        id: 'notification',
        user_id: 'owner',
        notification_type: 'emergency_report',
        title: 'Emergency report',
        message: 'Acknowledge responsibility',
        metadata: { emergency_report_id: 'report', emergency_cycle: 'cycle' },
        status: 'pending',
        retry_count: 0,
        scheduled_for: new Date().toISOString(),
      },
    ],
    notifications: [],
    user_notification_preferences: [
      {
        user_id: 'owner',
        push_enabled: true,
        in_app_enabled: false,
        disabled_types: ['tenant_report', 'emergency_report'],
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '07:00:00',
        timezone: 'Europe/London',
      },
    ],
    emergency_report_incidents: [
      { report_id: 'report', acknowledged_at: null, assigned_to: 'owner' },
    ],
  };
});
afterEach(() => vi.useRealTimers());
const processQueue = () =>
  NotificationProcessorService.processQueuedNotifications();

it('delivers emergency alerts during quiet hours despite routine type and in-app mutes', async () => {
  expect(nextQuietHoursEndUTC(await loadPreferences('owner'))).toEqual(
    new Date('2026-11-24T07:00:00Z')
  );
  expect(await processQueue()).toEqual({ queuedProcessed: 1, queuedErrors: 0 });
  expect(state.tables.notifications).toHaveLength(1);
  expect(state.push).toHaveBeenCalledTimes(1);
  expect(state.tables.notification_queue[0].status).toBe('sent');
  expect(state.tables.emergency_report_incidents[0].acknowledged_at).toBeNull();
  expect(state.rpc).toHaveBeenCalledWith('should_deliver_emergency_report', {
    p_report: 'report',
    p_actor: 'owner',
    p_cycle: 'cycle',
  });
});
it('preserves push opt-out while keeping an emergency in-app record', async () => {
  state.tables.user_notification_preferences[0].push_enabled = false;
  await processQueue();
  expect(state.tables.notifications).toHaveLength(1);
  expect(state.push).not.toHaveBeenCalled();
  expect(state.tables.emergency_report_incidents[0].acknowledged_at).toBeNull();
});
it('does not bypass preferences for ordinary tenant reports', async () => {
  state.tables.notification_queue[0].notification_type = 'tenant_report';
  await processQueue();
  expect(state.tables.notification_queue[0].status).toBe('cancelled');
  expect(state.tables.notifications).toHaveLength(0);
  expect(state.push).not.toHaveBeenCalled();
});
it('keeps failed delivery retryable without recording acknowledgment or duplicating the in-app alert', async () => {
  state.push.mockResolvedValue({ sent: false, reason: 'provider_unavailable' });
  await processQueue();
  expect(state.tables.notification_queue[0]).toMatchObject({
    status: 'failed_push',
    retry_count: 1,
  });
  expect(state.tables.emergency_report_incidents[0].acknowledged_at).toBeNull();
  vi.setSystemTime(new Date('2026-11-23T23:03:00Z'));
  state.push.mockResolvedValue({ sent: true, acceptedDeviceIds: ['device'] });
  await processQueue();
  expect(state.tables.notification_queue[0].status).toBe('sent');
  expect(state.tables.notifications).toHaveLength(1);
  expect(state.tables.emergency_report_incidents[0].acknowledged_at).toBeNull();
});
it('retains the alert after an in-app persistence failure', async () => {
  state.failTable = 'notifications';
  expect(await processQueue()).toMatchObject({ queuedErrors: 1 });
  expect(state.tables.notification_queue[0]).toMatchObject({
    status: 'pending',
    retry_count: 1,
  });
  expect(state.push).not.toHaveBeenCalled();
});
it.each(['pending', 'failed_push'])(
  'cancels stale %s delivery after ownership is lost or acknowledgment occurs',
  async (status) => {
    state.tables.notification_queue[0].status = status;
    state.rpc.mockResolvedValue({ data: false, error: null });
    await processQueue();
    expect(state.tables.notification_queue[0].status).toBe('cancelled');
    expect(state.tables.notifications).toHaveLength(0);
    expect(state.push).not.toHaveBeenCalled();
  }
);
it('fails closed and leaves the lease recoverable when assignment cannot be verified', async () => {
  state.rpc.mockResolvedValue({
    data: null,
    error: { message: 'database unavailable' },
  });
  expect(await processQueue()).toMatchObject({ queuedErrors: 1 });
  expect(state.tables.notification_queue[0].status).toBe('pending');
  expect(state.push).not.toHaveBeenCalled();
});
