/**
 * NotificationPreferenceResolver — fetches and interprets per-user
 * notification preferences for the NotificationService.
 *
 * Table `public.user_notification_preferences` (migration
 * 20260417000005). Absent row = all defaults (everything enabled,
 * UTC timezone, no quiet hours, no type-disables). That keeps the
 * behaviour backwards-compatible with accounts that have never hit
 * the preferences UI.
 *
 * R2 of docs/RETENTION_ROADMAP_2026.md.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface UserNotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  // 2026-05-24 audit-42 P2: live user_notification_preferences has
  // sms_enabled (verified via information_schema). The mobile prefs
  // screen + /api/user/notification-preferences both accept the field,
  // but the resolver wasn't loading it — so any SMS sender that
  // imports this preference model had no way to honour the user's
  // choice. Now mirrored in the model with the same permissive
  // default as the other channels.
  sms_enabled: boolean;
  disabled_types: string[];
  quiet_hours_start: string | null; // 'HH:MM:SS' or null
  quiet_hours_end: string | null;
  timezone: string; // IANA, e.g. 'Europe/London'
}

const DEFAULTS: Omit<UserNotificationPreferences, 'user_id'> = {
  push_enabled: true,
  email_enabled: true,
  in_app_enabled: true,
  sms_enabled: true,
  disabled_types: [],
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
};

function defaultsFor(userId: string): UserNotificationPreferences {
  return { user_id: userId, ...DEFAULTS };
}

/**
 * Load a user's notification preferences. Never throws — on any error
 * returns the permissive defaults so we never accidentally silence a
 * user because the preferences read failed.
 */
export async function loadPreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  try {
    const { data, error } = await serverSupabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.warn('Failed to load notification preferences — using defaults', {
        service: 'NotificationPreferenceResolver',
        userId,
        error: error.message,
      });
      return defaultsFor(userId);
    }
    if (!data) return defaultsFor(userId);

    // Normalise disabled_types which PostgREST returns as unknown JSON.
    const disabled = Array.isArray(data.disabled_types)
      ? (data.disabled_types as unknown[]).map(String)
      : [];

    return {
      user_id: data.user_id,
      push_enabled: Boolean(data.push_enabled),
      email_enabled: Boolean(data.email_enabled),
      in_app_enabled: Boolean(data.in_app_enabled),
      // 2026-05-24 audit-42 P2: live row may not have sms_enabled if it
      // predates the column being added — treat undefined as the
      // permissive default. Boolean(null/undefined) is false which
      // would silently mute SMS for legacy rows; explicit `=== false`
      // check keeps unset rows opted-in.
      sms_enabled: data.sms_enabled === false ? false : true,
      disabled_types: disabled,
      quiet_hours_start: data.quiet_hours_start ?? null,
      quiet_hours_end: data.quiet_hours_end ?? null,
      timezone: data.timezone || 'UTC',
    };
  } catch (err) {
    logger.warn('Preference load threw — using defaults', {
      service: 'NotificationPreferenceResolver',
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return defaultsFor(userId);
  }
}

/**
 * Notification types that are never user-mutable. The mobile prefs
 * banner (`NotificationPreferencesScreen.tsx`) explicitly promises
 * payment confirmations, escrow holds, and contractor "I'm on the way"
 * pings always reach the user. 2026-05-27 audit-71 P1: the same UI
 * also exposed mute toggles for `payment` (etc.), creating a contract
 * the server didn't honour. We enforce the always-on guarantee at two
 * layers: the client strips these types from disabled_types on save,
 * and this server check ignores them even if a row somehow contains
 * them (legacy data, third-party API caller). Add new types here when
 * the always-on banner copy expands.
 */
const ALWAYS_ON_TYPES = new Set<string>([
  'payment', // payment confirmations / escrow funding
  'payment_received', // legacy alias of payment
  'contractor_en_route', // "I'm on the way" homeowner notification
]);

export function isTypeDisabled(
  prefs: UserNotificationPreferences,
  type: string
): boolean {
  // 2026-05-27 audit-71 P1: critical alerts override user mutes. Even
  // if disabled_types somehow contains an ALWAYS_ON type the server
  // delivers it anyway — UI copy + this filter guarantee parity.
  if (ALWAYS_ON_TYPES.has(type)) return false;
  return prefs.disabled_types.includes(type);
}

/**
 * 2026-07-17: exported for NotificationService's caller-supplied
 * `deferUntil` guard — always-on types must never be deferred either.
 */
export function isAlwaysOnType(type: string): boolean {
  return ALWAYS_ON_TYPES.has(type);
}

/**
 * Convert `HH:MM:SS` or `HH:MM` to minutes-from-midnight.
 */
function timeStringToMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map((p) => Number.parseInt(p, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Return the current "wall-clock minutes from midnight" in the user's
 * local timezone. Falls back to UTC if Intl rejects the zone.
 */
function minutesInUserTz(tz: string, now: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    });
    const parts = fmt.formatToParts(now);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return h * 60 + m;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

/**
 * Are we currently inside the user's quiet hours? Handles wrap-around
 * (e.g. 22:00 → 07:00) and missing config (returns false).
 */
export function isInQuietHours(
  prefs: UserNotificationPreferences,
  now: Date = new Date()
): boolean {
  const start = timeStringToMinutes(prefs.quiet_hours_start);
  const end = timeStringToMinutes(prefs.quiet_hours_end);
  if (start === null || end === null) return false;

  const minutes = minutesInUserTz(prefs.timezone, now);
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  // Wrap-around across midnight.
  return minutes >= start || minutes < end;
}

/**
 * When do the user's current quiet hours end, in UTC? Returns null if
 * we are NOT in quiet hours. Used by NotificationService to schedule a
 * queued delivery instead of firing immediately.
 */
export function nextQuietHoursEndUTC(
  prefs: UserNotificationPreferences,
  now: Date = new Date()
): Date | null {
  if (!isInQuietHours(prefs, now)) return null;
  const end = timeStringToMinutes(prefs.quiet_hours_end);
  if (end === null) return null;

  const cur = minutesInUserTz(prefs.timezone, now);
  // Minutes until end boundary (handles wrap-around).
  const delta = end > cur ? end - cur : 24 * 60 - cur + end;
  return new Date(now.getTime() + delta * 60 * 1000);
}
