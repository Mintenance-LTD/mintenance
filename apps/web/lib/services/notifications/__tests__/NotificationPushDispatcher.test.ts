const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failTable: '',
  fetch: vi.fn(),
  logError: vi.fn(),
  pushEnabled: true,
}));

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: state.logError },
}));
vi.mock('../../agents/NotificationAgent', () => ({
  NotificationAgent: { getNotificationPriority: () => 'normal' },
}));
vi.mock('../NotificationPreferenceResolver', () => ({
  loadPreferences: async () => ({
    push_enabled: state.pushEnabled,
    in_app_enabled: true,
  }),
  isTypeDisabled: () => false,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from(table: string) {
      const filters: ((row: Record<string, unknown>) => boolean)[] = [];
      let operation = 'select';
      let values: Record<string, unknown> = {};
      let single = false;
      const query = {
        select: () => query,
        single: () => {
          single = true;
          return query;
        },
        maybeSingle: () => {
          single = true;
          return query;
        },
        limit: () => query,
        in: (key: string, values: unknown[]) => {
          filters.push((row) => values.includes(row[key]));
          return query;
        },
        lte: (key: string, value: string) => {
          filters.push((row) => String(row[key]) <= value);
          return query;
        },
        lt: (key: string, value: number) => {
          filters.push((row) => Number(row[key]) < value);
          return query;
        },
        eq: (key: string, value: unknown) => {
          filters.push((row) => row[key] === value);
          return query;
        },
        update: (value: Record<string, unknown>) => {
          operation = 'update';
          values = value;
          return query;
        },
        insert: (value: Record<string, unknown>) => {
          operation = 'insert';
          values = value;
          return query;
        },
        delete: () => {
          operation = 'delete';
          return query;
        },
        then(resolve: (value: unknown) => unknown) {
          if (state.failTable === table)
            return Promise.resolve(
              resolve({ error: { message: 'database unavailable' } })
            );
          const rows = state.tables[table] ?? [];
          const matches = rows.filter((row) =>
            filters.every((filter) => filter(row))
          );
          if (operation === 'update')
            matches.forEach((row) => Object.assign(row, values));
          if (operation === 'insert') {
            if (values.id && rows.some((row) => row.id === values.id)) {
              return Promise.resolve(
                resolve({ data: null, error: { code: '23505' } })
              );
            }
            rows.push(values);
          }
          if (operation === 'delete')
            state.tables[table] = rows.filter((row) => !matches.includes(row));
          return Promise.resolve(
            resolve({
              data: structuredClone(
                single
                  ? operation === 'insert'
                    ? values
                    : (matches[0] ?? null)
                  : matches
              ),
              count: matches.length,
              error: null,
            })
          );
        },
      };
      return query;
    },
  },
}));

import { sendPushToDevice } from '../NotificationPushDispatcher';
import { NotificationProcessorService } from '../NotificationProcessorService';

const params = {
  userId: 'owner',
  title: 'Synthetic update',
  body: 'Test',
  notificationType: 'job_update',
  notificationId: 'notification',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', state.fetch);
  state.failTable = '';
  state.pushEnabled = true;
  state.tables = {
    user_push_tokens: [
      { id: 'device-a', user_id: 'owner', push_token: 'token-a' },
      { id: 'device-b', user_id: 'owner', push_token: 'token-b' },
      { id: 'other-device', user_id: 'other', push_token: 'other-token' },
    ],
    notifications: [
      { id: 'notification', user_id: 'owner', read: false, push_sent: false },
    ],
    notification_queue: [],
  };
});
afterEach(() => vi.unstubAllGlobals());

function response(data: unknown) {
  return { ok: true, json: async () => ({ data }) };
}

it('does not equate HTTP 200 with acceptance; retries only the rejected device', async () => {
  state.fetch.mockResolvedValueOnce(
    response([
      { status: 'ok', id: 'ticket-a' },
      { status: 'error', details: { error: 'MessageRateExceeded' } },
    ])
  );
  const first = await sendPushToDevice(params);
  expect(first.sent).toBe(false);
  expect(first.acceptedDeviceIds).toEqual(['device-a']);
  expect(state.tables.notifications[0].push_sent).toBe(false);
  expect(state.tables.notification_queue[0].metadata).toEqual({
    original_notification_id: 'notification',
    push_accepted_device_ids: ['device-a'],
  });
  state.fetch.mockResolvedValueOnce(
    response([{ status: 'ok', id: 'ticket-b' }])
  );
  const retry = await sendPushToDevice({
    ...params,
    notificationType: undefined,
    acceptedDeviceIds: first.acceptedDeviceIds,
  });
  expect(retry.sent).toBe(true);
  expect(
    JSON.parse(state.fetch.mock.calls[1][1].body).map(
      (message: { to: string }) => message.to
    )
  ).toEqual(['token-b']);
  expect(state.tables.notifications[0]).toMatchObject({ push_sent: true });
  expect(state.tables.notifications[0]).not.toHaveProperty('delivered_at');
  expect(state.tables.notification_queue).toHaveLength(1);
});

it('removes only the rejected registered device owned by the recipient', async () => {
  state.fetch.mockResolvedValue(
    response([
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok', id: 'ticket-b' },
    ])
  );
  await sendPushToDevice(params);
  expect(state.tables.user_push_tokens.map((row) => row.id)).toEqual([
    'device-b',
    'other-device',
  ]);
});

it.each([undefined, [], [{ status: 'ok', id: 'one-ticket-only' }]])(
  'does not mark malformed or incomplete ticket responses successful (%j)',
  async (tickets) => {
    state.fetch.mockResolvedValue(response(tickets));
    expect((await sendPushToDevice(params)).sent).toBe(false);
    expect(state.tables.notifications[0].push_sent).toBe(false);
    expect(state.tables.notification_queue).toHaveLength(1);
  }
);

it('queues token lookup failures instead of treating them as an empty device list', async () => {
  state.failTable = 'user_push_tokens';
  expect((await sendPushToDevice(params)).sent).toBe(false);
  expect(state.fetch).not.toHaveBeenCalled();
  expect(state.tables.notification_queue).toHaveLength(1);
});

it('reports retry persistence failure instead of logging a successful enqueue', async () => {
  state.failTable = 'notification_queue';
  state.fetch.mockResolvedValue({ ok: false, status: 503 });
  expect((await sendPushToDevice(params)).sent).toBe(false);
  expect(state.logError).toHaveBeenCalled();
});

it('batches no more than 100 devices and preserves earlier acceptance after a later network failure', async () => {
  state.tables.user_push_tokens = Array.from({ length: 101 }, (_, index) => ({
    id: `device-${index}`,
    user_id: 'owner',
    push_token: `token-${index}`,
  }));
  state.fetch.mockResolvedValueOnce(
    response(
      Array.from({ length: 100 }, (_, index) => ({
        status: 'ok',
        id: `ticket-${index}`,
      }))
    )
  );
  state.fetch.mockRejectedValueOnce(new Error('network unavailable'));
  const result = await sendPushToDevice(params);
  expect(result.sent).toBe(false);
  expect(result.acceptedDeviceIds).toHaveLength(100);
  expect(JSON.parse(state.fetch.mock.calls[1][1].body)).toHaveLength(1);
});

function queueRow(status = 'pending') {
  return {
    id: 'queue-1',
    user_id: 'owner',
    notification_type: 'job_update',
    title: 'Test',
    message: 'Test',
    action_url: '/jobs/synthetic',
    metadata: {},
    status,
    retry_count: 0,
    scheduled_for: new Date(Date.now() - 1000).toISOString(),
  };
}

it('claims concurrent queue runs once and checkpoints before external delivery', async () => {
  state.tables.notification_queue.push(queueRow());
  state.fetch.mockImplementation(async () => {
    expect(state.tables.notification_queue[0].status).toBe('failed_push');
    return response([
      { status: 'ok', id: 'a' },
      { status: 'ok', id: 'b' },
    ]);
  });
  await Promise.all([
    NotificationProcessorService.processQueuedNotifications(),
    NotificationProcessorService.processQueuedNotifications(),
  ]);
  expect(state.fetch).toHaveBeenCalledTimes(1);
  expect(
    state.tables.notifications.filter((row) => row.id === 'queue-1')
  ).toHaveLength(1);
  expect(state.tables.notification_queue[0].status).toBe('sent');
});

it('replays an existing in-app insert without duplicating it or resetting read state', async () => {
  state.tables.notification_queue.push(queueRow());
  state.tables.notifications.push({
    id: 'queue-1',
    user_id: 'owner',
    read: true,
  });
  state.fetch.mockResolvedValue(
    response([
      { status: 'ok', id: 'a' },
      { status: 'ok', id: 'b' },
    ])
  );
  await NotificationProcessorService.processQueuedNotifications();
  expect(
    state.tables.notifications.filter((row) => row.id === 'queue-1')
  ).toEqual([{ id: 'queue-1', user_id: 'owner', read: true, push_sent: true }]);
});

it('persists partial device acceptance on the same queue row and strips internal routing fields', async () => {
  state.tables.notification_queue.push(queueRow());
  state.fetch.mockResolvedValueOnce(
    response([{ status: 'ok', id: 'a' }, { status: 'error' }])
  );
  await NotificationProcessorService.processQueuedNotifications();
  const queued = state.tables.notification_queue[0];
  expect(queued.status).toBe('failed_push');
  expect(queued.retry_count).toBe(1);
  expect(queued.metadata).toMatchObject({
    push_accepted_device_ids: ['device-a'],
  });
  queued.scheduled_for = new Date(Date.now() - 1000).toISOString();
  state.fetch.mockResolvedValueOnce(response([{ status: 'ok', id: 'b' }]));
  await NotificationProcessorService.processQueuedNotifications();
  const [message] = JSON.parse(state.fetch.mock.calls[1][1].body);
  expect(message.to).toBe('token-b');
  expect(message.data).not.toHaveProperty('push_accepted_device_ids');
  expect(message.data).not.toHaveProperty('original_notification_id');
  expect(state.tables.notification_queue).toHaveLength(1);
  expect(queued.status).toBe('sent');
});

it('respects a push opt-out made after the initial failure', async () => {
  state.tables.notification_queue.push(queueRow('failed_push'));
  state.pushEnabled = false;
  await NotificationProcessorService.processQueuedNotifications();
  expect(state.fetch).not.toHaveBeenCalled();
  expect(state.tables.notification_queue[0].status).toBe('cancelled');
});
