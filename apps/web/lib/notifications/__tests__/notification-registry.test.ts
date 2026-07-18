// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
//
// Parity locks for the canonical notification-type registry
// (@mintenance/types notification-types.ts, 2026-07-17). Before the
// registry, packages/data-access carried a 3-entry SOCIAL list while
// the web feed carried 4 — the mobile inbox showed `comment_replied`
// rows the web feed hid. These tests pin the single-source invariants
// so a new hand-copied list can't silently drift again.

import {
  SOCIAL_NOTIFICATION_TYPES,
  ALWAYS_ON_NOTIFICATION_TYPES,
  isSocialNotificationType,
  isAlwaysOnNotificationType,
} from '@mintenance/types';
import { SOCIAL_NOTIFICATION_TYPES as DATA_ACCESS_SOCIAL } from '@mintenance/data-access';

vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: {} }));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  isTypeDisabled,
  isAlwaysOnType,
} from '@/lib/services/notifications/NotificationPreferenceResolver';

describe('canonical SOCIAL registry', () => {
  it('contains all four retired social types (incl. comment_replied)', () => {
    expect([...SOCIAL_NOTIFICATION_TYPES].sort()).toEqual([
      'comment_added',
      'comment_replied',
      'new_follower',
      'post_liked',
    ]);
  });

  it('is the exact list data-access re-exports (drift fixed)', () => {
    // toEqual, not toBe: data-access ships its own dist bundle, so the
    // re-export is a separate module instance of the same values.
    expect([...DATA_ACCESS_SOCIAL]).toEqual([...SOCIAL_NOTIFICATION_TYPES]);
  });

  it('isSocialNotificationType matches the list and rejects others', () => {
    for (const t of SOCIAL_NOTIFICATION_TYPES) {
      expect(isSocialNotificationType(t)).toBe(true);
    }
    expect(isSocialNotificationType('job_nearby')).toBe(false);
    expect(isSocialNotificationType(null)).toBe(false);
  });
});

describe('canonical ALWAYS_ON registry', () => {
  const prefsWithEverythingMuted = {
    user_id: 'u-1',
    push_enabled: true,
    email_enabled: true,
    in_app_enabled: true,
    sms_enabled: true,
    disabled_types: [...ALWAYS_ON_NOTIFICATION_TYPES, 'job_nearby'],
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: 'UTC',
  };

  it('resolver honours every canonical always-on type', () => {
    for (const t of ALWAYS_ON_NOTIFICATION_TYPES) {
      expect(isAlwaysOnNotificationType(t)).toBe(true);
      expect(isAlwaysOnType(t)).toBe(true);
      // Even an explicit mute row cannot silence an always-on type.
      expect(isTypeDisabled(prefsWithEverythingMuted, t)).toBe(false);
    }
  });

  it('user-mutable types still respect the mute list', () => {
    expect(isTypeDisabled(prefsWithEverythingMuted, 'job_nearby')).toBe(true);
  });
});
