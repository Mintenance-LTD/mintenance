/**
 * NotificationPreferencesManager — bridge between legacy callers (which
 * still consume the old `NotificationPreferences` shape with bool flags
 * per-event) and the canonical server preference model backed by
 * `user_notification_preferences` (shape: { push/email/sms/in_app
 * boolean flags + disabled_types[] + quiet_hours_start/end + timezone }).
 *
 * 2026-05-27 audit-71 P1: previously this module read and wrote
 * `profiles.notification_preferences` directly via the Supabase client.
 * The server pipeline (NotificationPreferenceResolver on web) only reads
 * `user_notification_preferences`, so any preference saved through this
 * path was effectively invisible to NotificationService.createNotification
 * — verified via Supabase MCP, which showed 9 rows in the legacy column
 * (all `{}` empty placeholders today, but the divergence was a live
 * landmine) and 0 in the canonical table. This rewrite proxies to
 * /api/user/notification-preferences so the two sides agree.
 *
 * The legacy NotificationPreferences shape (pushEnabled / newJobs /
 * newBids / newMessages / jobUpdates / paymentUpdates / etc.) is
 * preserved on the public interface so existing callers (the example
 * file + tests) compile unchanged; we translate to/from the canonical
 * shape internally.
 */
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import * as sentry from '../../config/sentry';
import type { NotificationData, NotificationPreferences } from './types';

function addBreadcrumb(
  message: string,
  level: 'info' | 'warning' | 'error' | 'debug',
  data?: Record<string, unknown>
): void {
  const breadcrumbData = data ? { ...data, level } : { level };
  sentry.addBreadcrumb(message, 'notification', breadcrumbData);
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
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
};

// Canonical shape returned by /api/user/notification-preferences (server-
// side mirror of `user_notification_preferences`).
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

// Map from a legacy bool flag to the canonical event types it gates.
// Used in both directions: when reading, any disabled type in the bucket
// drops the legacy flag to false; when writing, !flag adds all the types
// to disabled_types.
const LEGACY_FLAG_TO_TYPES: Record<string, string[]> = {
  newJobs: ['job_nearby'],
  newBids: ['bid_received', 'bid_accepted'],
  newMessages: ['message_received', 'message'],
  jobUpdates: [
    'job_update',
    'job_started',
    'job_completed',
    'job_assigned',
    'job_confirmed',
    'changes_requested',
    'completion_confirmed',
  ],
  paymentUpdates: [
    'payment',
    'payment_received',
    'payment_released',
    'escrow_released',
    'escrow_auto_released',
  ],
  weeklyDigest: ['cashflow_digest'],
};

function canonicalToLegacy(c: CanonicalPrefs): NotificationPreferences {
  const disabled = new Set(c.disabled_types);
  const allDisabled = (types: string[] | undefined): boolean =>
    !!types && types.length > 0 && types.every((t) => disabled.has(t));
  return {
    ...DEFAULT_PREFERENCES,
    pushEnabled: c.push_enabled,
    emailEnabled: c.email_enabled,
    newJobs: !allDisabled(LEGACY_FLAG_TO_TYPES.newJobs),
    newBids: !allDisabled(LEGACY_FLAG_TO_TYPES.newBids),
    newMessages: !allDisabled(LEGACY_FLAG_TO_TYPES.newMessages),
    jobUpdates: !disabled.has('job_update'),
    paymentUpdates: !disabled.has('payment'),
    weeklyDigest: !disabled.has('cashflow_digest'),
    quietHoursEnabled: !!c.quiet_hours_start && !!c.quiet_hours_end,
    quietHoursStart: c.quiet_hours_start || '22:00',
    quietHoursEnd: c.quiet_hours_end || '07:00',
  };
}

function legacyToCanonicalPatch(
  prev: CanonicalPrefs,
  legacyPatch: Partial<NotificationPreferences>
): Partial<CanonicalPrefs> {
  const disabled = new Set(prev.disabled_types);

  // Apply legacy bool flips → mutate the disabled_types set.
  const applyFlag = (flag: keyof NotificationPreferences) => {
    const value = legacyPatch[flag];
    if (typeof value !== 'boolean') return;
    const types = LEGACY_FLAG_TO_TYPES[flag as string];
    if (!types) return;
    if (value) {
      types.forEach((t) => disabled.delete(t));
    } else {
      types.forEach((t) => disabled.add(t));
    }
  };
  (
    [
      'newJobs',
      'newBids',
      'newMessages',
      'jobUpdates',
      'paymentUpdates',
      'weeklyDigest',
    ] as Array<keyof NotificationPreferences>
  ).forEach(applyFlag);

  const out: Partial<CanonicalPrefs> = {
    disabled_types: Array.from(disabled),
  };
  if (typeof legacyPatch.pushEnabled === 'boolean') {
    out.push_enabled = legacyPatch.pushEnabled;
  }
  if (typeof legacyPatch.emailEnabled === 'boolean') {
    out.email_enabled = legacyPatch.emailEnabled;
  }
  // 2026-05-27 audit-76 follow-up: only the explicit
  // `quietHoursEnabled === false` signal clears the window. The
  // previous heuristic also cleared when enabled was undefined AND
  // both start/end happened to be empty strings — which conflated a
  // legitimate caller blanking just one end with "user wants quiet
  // hours off". Forces callers to be explicit; partial updates that
  // only touch one field are now no-ops on the other.
  if (legacyPatch.quietHoursEnabled === false) {
    out.quiet_hours_start = null;
    out.quiet_hours_end = null;
  } else if (legacyPatch.quietHoursEnabled === true) {
    if (legacyPatch.quietHoursStart) {
      out.quiet_hours_start = legacyPatch.quietHoursStart;
    }
    if (legacyPatch.quietHoursEnd) {
      out.quiet_hours_end = legacyPatch.quietHoursEnd;
    }
  }
  return out;
}

async function loadCanonical(): Promise<CanonicalPrefs> {
  return mobileApiClient.get<CanonicalPrefs>(
    '/api/user/notification-preferences'
  );
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const canonical = await loadCanonical();
    const legacy = canonicalToLegacy(canonical);
    addBreadcrumb('Fetched notification preferences', 'debug', {
      userId,
      preferences: legacy,
    });
    return legacy;
  } catch (error) {
    logger.error('Failed to get notification preferences', error);
    throw error;
  }
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const current = await loadCanonical();
    const patch = legacyToCanonicalPatch(current, preferences);
    await mobileApiClient.patch('/api/user/notification-preferences', patch);
    logger.info('Notification preferences updated', { userId });
    addBreadcrumb('Updated notification preferences', 'info', {
      userId,
      quietHoursEnabled: Boolean(preferences.quietHoursEnabled),
    });
  } catch (error) {
    logger.error('Failed to update notification preferences', error);
    throw error;
  }
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function shouldSendNotification(
  preferences: NotificationPreferences,
  type: NotificationData['type']
): boolean {
  const safePreferences: NotificationPreferences = {
    pushEnabled: preferences?.pushEnabled ?? true,
    newJobs: preferences?.newJobs ?? true,
    newBids: preferences?.newBids ?? true,
    newMessages: preferences?.newMessages ?? true,
    jobUpdates: preferences?.jobUpdates ?? true,
    paymentUpdates: preferences?.paymentUpdates ?? true,
    emailEnabled: preferences?.emailEnabled ?? true,
    weeklyDigest: preferences?.weeklyDigest ?? true,
    promotionalEmails: preferences?.promotionalEmails ?? false,
    securityAlerts: preferences?.securityAlerts ?? true,
    soundEnabled: preferences?.soundEnabled ?? true,
    vibrationEnabled: preferences?.vibrationEnabled ?? true,
    marketingEmails: preferences?.marketingEmails ?? false,
    productUpdates: preferences?.productUpdates ?? true,
    quietHoursEnabled: preferences?.quietHoursEnabled ?? false,
    quietHoursStart: preferences?.quietHoursStart || '22:00',
    quietHoursEnd: preferences?.quietHoursEnd || '07:00',
  };

  // Push notifications globally disabled
  if (!safePreferences.pushEnabled) {
    return false;
  }

  // Check quiet hours
  if (safePreferences.quietHoursEnabled) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = parseTime(safePreferences.quietHoursStart);
    const endTime = parseTime(safePreferences.quietHoursEnd);

    if (startTime <= endTime) {
      if (currentTime >= startTime && currentTime <= endTime) {
        return false;
      }
    } else {
      if (currentTime >= startTime || currentTime <= endTime) {
        return false;
      }
    }
  }

  switch (type) {
    case 'job_update':
      return safePreferences.jobUpdates;
    case 'bid_received':
      return safePreferences.newBids;
    case 'meeting_scheduled':
      return safePreferences.newJobs;
    case 'payment_received':
      return safePreferences.paymentUpdates;
    case 'message_received':
      return safePreferences.newMessages;
    case 'quote_sent':
      return safePreferences.newBids;
    case 'system':
      return safePreferences.pushEnabled;
    default:
      return true;
  }
}

export function getChannelId(type: NotificationData['type']): string {
  switch (type) {
    case 'job_update':
      return 'job-updates';
    case 'bid_received':
      return 'bid-notifications';
    case 'meeting_scheduled':
      return 'meeting-reminders';
    default:
      return 'default';
  }
}
