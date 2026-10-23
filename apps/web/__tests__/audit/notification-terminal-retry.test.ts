// @vitest-environment node
const m = vi.hoisted(() => ({
  update: vi.fn(),
  error: null as { message: string } | null,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q: Record<string, any> = {};
      q.update = (value: unknown) => {
        m.update(value);
        return q;
      };
      q.eq = () => q;
      q.then = (resolve: (result: unknown) => unknown) =>
        Promise.resolve(resolve({ error: m.error }));
      return q;
    },
  },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
import {
  bumpRetryOrFail,
  type QueuedNotificationRow,
} from '@/lib/services/notifications/NotificationQueueRetry';
const row: QueuedNotificationRow = {
  id: 'queue',
  user_id: 'owner',
  notification_type: 'payment',
  title: 'Payment',
  message: 'Update',
  status: 'failed_push',
  retry_count: 0,
  scheduled_for: '2026-10-23T10:00:00Z',
  action_url: null,
  metadata: {},
};
beforeEach(() => {
  vi.clearAllMocks();
  m.error = null;
});
it('stops after the first missing-token result instead of retrying six times', async () => {
  await bumpRetryOrFail(row, 'no_push_tokens');
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'failed',
      error_message: 'no_push_tokens',
      retry_count: 1,
    })
  );
  expect(m.update.mock.calls[0][0]).not.toHaveProperty('scheduled_for');
});
it('continues retrying a transient provider failure', async () => {
  await bumpRetryOrFail(row, 'expo_unavailable');
  expect(m.update.mock.calls[0][0]).toHaveProperty('scheduled_for');
  expect(m.update.mock.calls[0][0]).not.toHaveProperty('status', 'failed');
});
it('surfaces failure to persist the terminal result', async () => {
  m.error = { message: 'unavailable' };
  await expect(bumpRetryOrFail(row, 'no_push_tokens')).rejects.toThrow(
    'notification_failure_checkpoint_failed'
  );
});
