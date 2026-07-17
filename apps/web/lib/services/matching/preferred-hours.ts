/**
 * Contractor preferred-hours interpretation (deferred item from the
 * 2026-07-17 matching integration, Phase 2.2).
 *
 * `service_areas.preferred_days` (['monday', …]) + `preferred_hours`
 * ({ start: '09:00', end: '17:00' }) are a SOFT politeness signal for
 * job_nearby pushes: when a job posts outside a contractor's working
 * window we defer their push to the next window start — we never
 * suppress it, and we never defer further than MAX_DEFER_HOURS (a
 * Friday-evening job must not sit silent until Monday; past the cap we
 * just send immediately). ALWAYS_ON_TYPES are exempted one layer down
 * in NotificationService.
 *
 * service_areas has no timezone column; the platform operates in the
 * UK, so windows are interpreted in Europe/London (DST-safe via Intl).
 */

export interface PreferredHoursWindow {
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'
}

export const SERVICE_AREA_TIMEZONE = 'Europe/London';

/** Deferrals longer than this are dropped (send immediately instead). */
export const MAX_DEFER_HOURS = 12;

/** Scan resolution — precision of the returned window start. */
const STEP_MINUTES = 15;

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function toMinutes(t: string | undefined): number | null {
  if (typeof t !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins < 24 * 60 ? mins : null;
}

/** Parse an unknown jsonb payload into a window, or null if unusable. */
export function parsePreferredHours(
  value: unknown
): PreferredHoursWindow | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.start !== 'string' || typeof v.end !== 'string') return null;
  if (toMinutes(v.start) === null || toMinutes(v.end) === null) return null;
  return { start: v.start, end: v.end };
}

interface LocalClock {
  day: string; // lowercase weekday name in tz
  minutes: number; // minutes from local midnight
}

function localClock(now: Date, tz: string): LocalClock {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    });
    const parts = fmt.formatToParts(now);
    const day = (
      parts.find((p) => p.type === 'weekday')?.value ?? ''
    ).toLowerCase();
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return { day, minutes: h * 60 + m };
  } catch {
    return {
      day: DAY_KEYS[now.getUTCDay()],
      minutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
    };
  }
}

function previousDayName(day: string): string {
  const idx = DAY_KEYS.indexOf(day);
  return idx < 0 ? day : DAY_KEYS[(idx + 6) % 7];
}

/**
 * Is `now` inside the contractor's preferred window?
 * - empty/null days ⇒ every day qualifies
 * - null/invalid hours ⇒ any time on a preferred day qualifies
 * - overnight windows (start > end, e.g. 22:00–06:00) attribute the
 *   post-midnight tail to the day the window STARTED.
 */
export function isWithinPreferredWindow(
  preferredDays: string[] | null | undefined,
  preferredHours: PreferredHoursWindow | null | undefined,
  now: Date = new Date(),
  tz: string = SERVICE_AREA_TIMEZONE
): boolean {
  const days =
    preferredDays && preferredDays.length > 0
      ? preferredDays.map((d) => d.toLowerCase())
      : null;
  const clock = localClock(now, tz);

  const dayOk = (day: string) => days === null || days.includes(day);

  const start = toMinutes(preferredHours?.start);
  const end = toMinutes(preferredHours?.end);
  if (start === null || end === null || start === end) {
    return dayOk(clock.day);
  }

  if (start < end) {
    return dayOk(clock.day) && clock.minutes >= start && clock.minutes < end;
  }
  // Overnight: [start, midnight) belongs to today; [midnight, end) to
  // the day the window started (yesterday).
  if (clock.minutes >= start) return dayOk(clock.day);
  if (clock.minutes < end) return dayOk(previousDayName(clock.day));
  return false;
}

/**
 * When should an out-of-hours push fire instead? Returns:
 * - null when `now` is already inside the window (send immediately),
 * - null when the next window is beyond MAX_DEFER_HOURS (deferring
 *   that long would bury the job — send immediately),
 * - otherwise the next window start, at STEP_MINUTES resolution.
 *
 * Implementation deliberately steps wall-clock time instead of doing
 * inverse timezone arithmetic — ≤ (12h / 15min) = 48 iterations, and
 * DST transitions fall out correctly because each step re-reads the
 * local clock via Intl.
 */
export function nextPreferredWindowStart(
  preferredDays: string[] | null | undefined,
  preferredHours: PreferredHoursWindow | null | undefined,
  now: Date = new Date(),
  tz: string = SERVICE_AREA_TIMEZONE
): Date | null {
  if (isWithinPreferredWindow(preferredDays, preferredHours, now, tz)) {
    return null;
  }

  const stepMs = STEP_MINUTES * 60 * 1000;
  const maxSteps = (MAX_DEFER_HOURS * 60) / STEP_MINUTES;
  for (let i = 1; i <= maxSteps; i++) {
    const candidate = new Date(now.getTime() + i * stepMs);
    if (isWithinPreferredWindow(preferredDays, preferredHours, candidate, tz)) {
      return candidate;
    }
  }
  return null;
}
