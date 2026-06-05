/**
 * NotificationPreferencesManager — bridge between the legacy bool-flag
 * NotificationPreferences shape and the canonical server preference model
 * (`user_notification_preferences`, proxied via
 * /api/user/notification-preferences).
 *
 * These tests exercise the real unit (NOT mocked) and pin every branch:
 *   - getNotificationPreferences: success translation + error rethrow.
 *   - updateNotificationPreferences: load → patch → PATCH wiring, the
 *     per-flag disabled_types add/delete logic, push/email flag passthrough,
 *     quiet-hours enable/disable/partial semantics, and error rethrow.
 *   - shouldSendNotification: global push gate, quiet-hours same-day vs
 *     overnight windows (inside/outside), every switch case + default,
 *     and the safePreferences null-coalescing defaults.
 *   - getChannelId: every mapped type + default.
 *
 * Externals mocked: mobileApiClient (get/patch), logger, sentry.
 */

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPost = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  __esModule: true,
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockAddBreadcrumb = jest.fn();
jest.mock('../../../config/sentry', () => ({
  __esModule: true,
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
  captureException: jest.fn(),
}));

import {
  getNotificationPreferences,
  updateNotificationPreferences,
  shouldSendNotification,
  getChannelId,
} from '../NotificationPreferencesManager';
import type { NotificationPreferences } from '../types';

interface CanonicalPrefs {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  disabled_types: string[];
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

function makeCanonical(
  overrides: Partial<CanonicalPrefs> = {}
): CanonicalPrefs {
  return {
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    in_app_enabled: true,
    disabled_types: [],
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: 'Europe/London',
    ...overrides,
  };
}

// A fully-populated legacy prefs object (so we can override single fields
// to isolate each branch of shouldSendNotification).
function makePrefs(
  overrides: Partial<NotificationPreferences> = {}
): NotificationPreferences {
  return {
    pushEnabled: true,
    newJobs: true,
    newBids: true,
    newMessages: true,
    jobUpdates: true,
    paymentUpdates: true,
    emailEnabled: true,
    weeklyDigest: true,
    promotionalEmails: false,
    securityAlerts: true,
    soundEnabled: true,
    vibrationEnabled: true,
    marketingEmails: false,
    productUpdates: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNotificationPreferences', () => {
  it('translates an all-enabled canonical payload to the legacy shape', async () => {
    mockGet.mockResolvedValue(makeCanonical());

    const result = await getNotificationPreferences('user-1');

    expect(mockGet).toHaveBeenCalledWith('/api/user/notification-preferences');
    expect(result.pushEnabled).toBe(true);
    expect(result.emailEnabled).toBe(true);
    expect(result.newJobs).toBe(true);
    expect(result.newBids).toBe(true);
    expect(result.newMessages).toBe(true);
    expect(result.jobUpdates).toBe(true);
    expect(result.paymentUpdates).toBe(true);
    expect(result.weeklyDigest).toBe(true);
    // No quiet hours start/end -> disabled, defaults applied.
    expect(result.quietHoursEnabled).toBe(false);
    expect(result.quietHoursStart).toBe('22:00');
    expect(result.quietHoursEnd).toBe('07:00');
    // breadcrumb emitted on success
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      'Fetched notification preferences',
      'notification',
      expect.objectContaining({ level: 'debug' })
    );
  });

  it('drops a legacy flag only when ALL types in its bucket are disabled (newBids needs both)', async () => {
    // bid_received disabled but bid_accepted still enabled -> newBids stays true
    mockGet.mockResolvedValue(
      makeCanonical({ disabled_types: ['bid_received'] })
    );
    const r1 = await getNotificationPreferences('u');
    expect(r1.newBids).toBe(true);

    mockGet.mockResolvedValue(
      makeCanonical({ disabled_types: ['bid_received', 'bid_accepted'] })
    );
    const r2 = await getNotificationPreferences('u');
    expect(r2.newBids).toBe(false);
  });

  it('drops newJobs when its single bucket type is disabled', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({ disabled_types: ['job_nearby'] })
    );
    const r = await getNotificationPreferences('u');
    expect(r.newJobs).toBe(false);
  });

  it('drops newMessages only when both message_received and message are disabled', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({ disabled_types: ['message_received'] })
    );
    expect((await getNotificationPreferences('u')).newMessages).toBe(true);

    mockGet.mockResolvedValue(
      makeCanonical({ disabled_types: ['message_received', 'message'] })
    );
    expect((await getNotificationPreferences('u')).newMessages).toBe(false);
  });

  it('uses has() lookups for jobUpdates/paymentUpdates/weeklyDigest', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({
        disabled_types: ['job_update', 'payment', 'cashflow_digest'],
      })
    );
    const r = await getNotificationPreferences('u');
    expect(r.jobUpdates).toBe(false);
    expect(r.paymentUpdates).toBe(false);
    expect(r.weeklyDigest).toBe(false);
  });

  it('surfaces quiet hours when both start AND end are present', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({ quiet_hours_start: '23:00', quiet_hours_end: '06:30' })
    );
    const r = await getNotificationPreferences('u');
    expect(r.quietHoursEnabled).toBe(true);
    expect(r.quietHoursStart).toBe('23:00');
    expect(r.quietHoursEnd).toBe('06:30');
  });

  it('does NOT enable quiet hours when only start is present (end null)', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({ quiet_hours_start: '23:00', quiet_hours_end: null })
    );
    const r = await getNotificationPreferences('u');
    expect(r.quietHoursEnabled).toBe(false);
    // start passed through, end falls back to default
    expect(r.quietHoursStart).toBe('23:00');
    expect(r.quietHoursEnd).toBe('07:00');
  });

  it('logs and rethrows when loadCanonical fails', async () => {
    const err = new Error('network down');
    mockGet.mockRejectedValue(err);

    await expect(getNotificationPreferences('user-x')).rejects.toThrow(
      'network down'
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to get notification preferences',
      err
    );
  });
});

describe('updateNotificationPreferences', () => {
  it('adds bucket types to disabled_types when a flag is set false', async () => {
    mockGet.mockResolvedValue(makeCanonical({ disabled_types: [] }));
    mockPatch.mockResolvedValue(undefined);

    await updateNotificationPreferences('user-1', {
      paymentUpdates: false,
    });

    expect(mockPatch).toHaveBeenCalledTimes(1);
    const [url, patch] = mockPatch.mock.calls[0];
    expect(url).toBe('/api/user/notification-preferences');
    // all 5 payment types added
    expect(patch.disabled_types).toEqual(
      expect.arrayContaining([
        'payment',
        'payment_received',
        'payment_released',
        'escrow_released',
        'escrow_auto_released',
      ])
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Notification preferences updated',
      { userId: 'user-1' }
    );
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      'Updated notification preferences',
      'notification',
      expect.objectContaining({ level: 'info', userId: 'user-1' })
    );
  });

  it('removes bucket types from disabled_types when a flag is set true', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({
        disabled_types: ['bid_received', 'bid_accepted', 'job_nearby'],
      })
    );
    mockPatch.mockResolvedValue(undefined);

    await updateNotificationPreferences('user-1', { newBids: true });

    const [, patch] = mockPatch.mock.calls[0];
    // both bid types removed, job_nearby retained
    expect(patch.disabled_types).not.toContain('bid_received');
    expect(patch.disabled_types).not.toContain('bid_accepted');
    expect(patch.disabled_types).toContain('job_nearby');
  });

  it('ignores non-boolean flag values (applyFlag typeof guard)', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({ disabled_types: ['job_nearby'] })
    );
    mockPatch.mockResolvedValue(undefined);

    // newJobs left undefined -> applyFlag returns early, set unchanged
    await updateNotificationPreferences('user-1', {});

    const [, patch] = mockPatch.mock.calls[0];
    expect(patch.disabled_types).toEqual(['job_nearby']);
    expect(patch.push_enabled).toBeUndefined();
    expect(patch.email_enabled).toBeUndefined();
  });

  it('passes through push_enabled and email_enabled when booleans are provided', async () => {
    mockGet.mockResolvedValue(makeCanonical());
    mockPatch.mockResolvedValue(undefined);

    await updateNotificationPreferences('user-1', {
      pushEnabled: false,
      emailEnabled: false,
    });

    const [, patch] = mockPatch.mock.calls[0];
    expect(patch.push_enabled).toBe(false);
    expect(patch.email_enabled).toBe(false);
  });

  it('clears quiet hours window when quietHoursEnabled === false', async () => {
    mockGet.mockResolvedValue(
      makeCanonical({ quiet_hours_start: '22:00', quiet_hours_end: '07:00' })
    );
    mockPatch.mockResolvedValue(undefined);

    await updateNotificationPreferences('user-1', {
      quietHoursEnabled: false,
    });

    const [, patch] = mockPatch.mock.calls[0];
    expect(patch.quiet_hours_start).toBeNull();
    expect(patch.quiet_hours_end).toBeNull();
  });

  it('sets quiet hours window when enabled === true with both start and end', async () => {
    mockGet.mockResolvedValue(makeCanonical());
    mockPatch.mockResolvedValue(undefined);

    await updateNotificationPreferences('user-1', {
      quietHoursEnabled: true,
      quietHoursStart: '23:30',
      quietHoursEnd: '06:00',
    });

    const [, patch] = mockPatch.mock.calls[0];
    expect(patch.quiet_hours_start).toBe('23:30');
    expect(patch.quiet_hours_end).toBe('06:00');
  });

  it('only sets the provided end of the window when enabled === true (start omitted)', async () => {
    mockGet.mockResolvedValue(makeCanonical());
    mockPatch.mockResolvedValue(undefined);

    await updateNotificationPreferences('user-1', {
      quietHoursEnabled: true,
      quietHoursEnd: '05:00',
    });

    const [, patch] = mockPatch.mock.calls[0];
    expect(patch.quiet_hours_start).toBeUndefined();
    expect(patch.quiet_hours_end).toBe('05:00');
  });

  it('does not touch the window when quietHoursEnabled is undefined', async () => {
    mockGet.mockResolvedValue(makeCanonical());
    mockPatch.mockResolvedValue(undefined);

    await updateNotificationPreferences('user-1', { newJobs: false });

    const [, patch] = mockPatch.mock.calls[0];
    expect('quiet_hours_start' in patch).toBe(false);
    expect('quiet_hours_end' in patch).toBe(false);
  });

  it('logs and rethrows when load fails', async () => {
    const err = new Error('load boom');
    mockGet.mockRejectedValue(err);

    await expect(
      updateNotificationPreferences('user-1', { newJobs: false })
    ).rejects.toThrow('load boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to update notification preferences',
      err
    );
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('logs and rethrows when the PATCH fails', async () => {
    mockGet.mockResolvedValue(makeCanonical());
    const err = new Error('patch boom');
    mockPatch.mockRejectedValue(err);

    await expect(
      updateNotificationPreferences('user-1', { newJobs: false })
    ).rejects.toThrow('patch boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to update notification preferences',
      err
    );
  });
});

describe('shouldSendNotification — global push gate', () => {
  it('returns false when pushEnabled is false', () => {
    expect(
      shouldSendNotification(makePrefs({ pushEnabled: false }), 'job_update')
    ).toBe(false);
  });

  it('defaults pushEnabled to true when preferences object is empty', () => {
    // empty object -> safePreferences fills defaults, push allowed
    expect(
      shouldSendNotification(
        {} as unknown as NotificationPreferences,
        'job_update'
      )
    ).toBe(true);
  });

  it('handles a null preferences argument via optional chaining defaults', () => {
    expect(
      shouldSendNotification(
        null as unknown as NotificationPreferences,
        'system'
      )
    ).toBe(true);
  });
});

describe('shouldSendNotification — quiet hours', () => {
  const RealDate = Date;

  function freezeClock(hours: number, minutes: number) {
    const fixed = new RealDate(2026, 0, 1, hours, minutes, 0);
    // @ts-expect-error override for deterministic test
    global.Date = class extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super();
          return fixed as unknown as Date;
        }
        // @ts-expect-error spread to super
        super(...args);
      }
    } as DateConstructor;
  }

  afterEach(() => {
    global.Date = RealDate;
  });

  it('same-day window: blocks when current time is inside [start,end]', () => {
    freezeClock(13, 0); // 13:00
    const prefs = makePrefs({
      quietHoursEnabled: true,
      quietHoursStart: '12:00',
      quietHoursEnd: '14:00',
    });
    expect(shouldSendNotification(prefs, 'job_update')).toBe(false);
  });

  it('same-day window: allows when current time is outside [start,end]', () => {
    freezeClock(15, 0); // 15:00, outside 12:00-14:00
    const prefs = makePrefs({
      quietHoursEnabled: true,
      quietHoursStart: '12:00',
      quietHoursEnd: '14:00',
    });
    expect(shouldSendNotification(prefs, 'job_update')).toBe(true);
  });

  it('overnight window: blocks when current time >= start (late night)', () => {
    freezeClock(23, 30); // 23:30 within 22:00-07:00 overnight
    const prefs = makePrefs({
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });
    expect(shouldSendNotification(prefs, 'job_update')).toBe(false);
  });

  it('overnight window: blocks when current time <= end (early morning)', () => {
    freezeClock(5, 0); // 05:00 within 22:00-07:00 overnight
    const prefs = makePrefs({
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });
    expect(shouldSendNotification(prefs, 'job_update')).toBe(false);
  });

  it('overnight window: allows when current time is in the daytime gap', () => {
    freezeClock(12, 0); // 12:00 outside 22:00-07:00 overnight
    const prefs = makePrefs({
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });
    expect(shouldSendNotification(prefs, 'job_update')).toBe(true);
  });

  it('uses default 22:00/07:00 when quiet hour strings are empty', () => {
    freezeClock(23, 0); // inside default overnight window
    const prefs = makePrefs({
      quietHoursEnabled: true,
      quietHoursStart: '',
      quietHoursEnd: '',
    });
    expect(shouldSendNotification(prefs, 'job_update')).toBe(false);
  });
});

describe('shouldSendNotification — type routing switch', () => {
  it('job_update -> jobUpdates flag', () => {
    expect(
      shouldSendNotification(makePrefs({ jobUpdates: false }), 'job_update')
    ).toBe(false);
    expect(
      shouldSendNotification(makePrefs({ jobUpdates: true }), 'job_update')
    ).toBe(true);
  });

  it('bid_received -> newBids flag', () => {
    expect(
      shouldSendNotification(makePrefs({ newBids: false }), 'bid_received')
    ).toBe(false);
  });

  it('meeting_scheduled -> newJobs flag', () => {
    expect(
      shouldSendNotification(makePrefs({ newJobs: false }), 'meeting_scheduled')
    ).toBe(false);
  });

  it('payment_received -> paymentUpdates flag', () => {
    expect(
      shouldSendNotification(
        makePrefs({ paymentUpdates: false }),
        'payment_received'
      )
    ).toBe(false);
  });

  it('message_received -> newMessages flag', () => {
    expect(
      shouldSendNotification(
        makePrefs({ newMessages: false }),
        'message_received'
      )
    ).toBe(false);
  });

  it('quote_sent -> newBids flag', () => {
    expect(
      shouldSendNotification(makePrefs({ newBids: false }), 'quote_sent')
    ).toBe(false);
  });

  it('system -> pushEnabled flag (true path; push already gated above)', () => {
    expect(shouldSendNotification(makePrefs(), 'system')).toBe(true);
  });

  it('unknown / unmapped type -> default true', () => {
    expect(
      shouldSendNotification(makePrefs(), 'review_requested' as never)
    ).toBe(true);
  });
});

describe('getChannelId', () => {
  it('maps job_update to job-updates', () => {
    expect(getChannelId('job_update')).toBe('job-updates');
  });
  it('maps bid_received to bid-notifications', () => {
    expect(getChannelId('bid_received')).toBe('bid-notifications');
  });
  it('maps meeting_scheduled to meeting-reminders', () => {
    expect(getChannelId('meeting_scheduled')).toBe('meeting-reminders');
  });
  it('falls back to default for any other type', () => {
    expect(getChannelId('payment_received')).toBe('default');
    expect(getChannelId('system')).toBe('default');
  });
});
