// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

const {
  mockFrom,
  mockLoadPreferences,
  mockShouldSendImmediately,
  mockQueueNotification,
  mockSendPush,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoadPreferences: vi.fn(),
  mockShouldSendImmediately: vi.fn(),
  mockQueueNotification: vi.fn(),
  mockSendPush: vi.fn(),
}));

function buildInsertChain(id = 'notif-1') {
  const chain: Record<string, any> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: { id }, error: null });
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mockFrom },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real resolver logic for isAlwaysOnType; stub the DB-backed loader.
vi.mock('../NotificationPreferenceResolver', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../NotificationPreferenceResolver')>();
  return { ...actual, loadPreferences: mockLoadPreferences };
});

vi.mock('../../agents/NotificationAgent', () => ({
  NotificationAgent: {
    shouldSendImmediately: mockShouldSendImmediately,
    queueNotification: mockQueueNotification,
    getNotificationPriority: vi.fn().mockReturnValue('normal'),
  },
}));

vi.mock('../NotificationPushDispatcher', () => ({
  sendPushToDevice: mockSendPush,
}));

import { NotificationService } from '../NotificationService';

const PERMISSIVE_PREFS = {
  user_id: 'u-1',
  push_enabled: true,
  email_enabled: true,
  in_app_enabled: true,
  sms_enabled: true,
  disabled_types: [],
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
};

function baseParams(overrides?: Record<string, unknown>) {
  return {
    userId: 'u-1',
    type: 'job_nearby',
    title: 'New Job Near You',
    message: 'msg',
    metadata: { jobId: 'job-1' },
    ...overrides,
  };
}

describe('NotificationService.createNotification — deferUntil', () => {
  beforeEach(() => {
    mockLoadPreferences.mockResolvedValue(PERMISSIVE_PREFS);
    mockShouldSendImmediately.mockResolvedValue({ immediate: true });
    mockQueueNotification.mockResolvedValue('queue-1');
    mockFrom.mockReturnValue(buildInsertChain());
  });

  it('queues instead of firing when deferUntil is in the future', async () => {
    const deferUntil = new Date(Date.now() + 60 * 60 * 1000);

    const id = await NotificationService.createNotification(
      baseParams({ deferUntil })
    );

    expect(id).toBe('queue-1');
    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledFor: deferUntil })
    );
    expect(mockFrom).not.toHaveBeenCalled(); // no immediate in-app row
    expect(mockSendPush).not.toHaveBeenCalled(); // no immediate push
  });

  it('ignores deferUntil for ALWAYS_ON types (payment fires now)', async () => {
    const deferUntil = new Date(Date.now() + 60 * 60 * 1000);

    const id = await NotificationService.createNotification(
      baseParams({ type: 'payment', deferUntil })
    );

    expect(id).toBe('notif-1');
    expect(mockQueueNotification).not.toHaveBeenCalled();
    expect(mockSendPush).toHaveBeenCalled();
  });

  it('ignores a deferUntil in the past (fires immediately)', async () => {
    const deferUntil = new Date(Date.now() - 60 * 1000);

    const id = await NotificationService.createNotification(
      baseParams({ deferUntil })
    );

    expect(id).toBe('notif-1');
    expect(mockQueueNotification).not.toHaveBeenCalled();
  });

  it('without deferUntil behaves exactly as before (immediate path)', async () => {
    const id = await NotificationService.createNotification(baseParams());

    expect(id).toBe('notif-1');
    expect(mockQueueNotification).not.toHaveBeenCalled();
    expect(mockSendPush).toHaveBeenCalled();
  });

  it('keeps the LATER of quiet-hours end vs deferUntil', async () => {
    // Quiet hours active for another 2h; deferUntil is 3h out — the
    // contractor's window start must win (never deliver early).
    const in2h = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const in3h = new Date(Date.now() + 3 * 60 * 60 * 1000);
    mockShouldSendImmediately.mockResolvedValue({
      immediate: false,
      scheduledFor: in2h,
      reason: 'engagement-timing',
    });

    await NotificationService.createNotification(
      baseParams({ deferUntil: in3h })
    );

    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledFor: in3h })
    );
  });
});
