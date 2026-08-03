/**
 * Quiet-hours time helpers for NotificationPreferencesScreen.
 *
 * Pure string logic, kept out of the screen so it can be unit-tested
 * without pulling the React Native module graph into the test.
 */

/** HH:MM validator. Permissive — accepts "9:00" as well as "09:00". */
export const HHMM = /^([0-1]?\d|2[0-3]):[0-5]\d$/;

/**
 * Pad a single-digit hour so the value matches the SERVER contract.
 *
 * 2026-07-31 audit P2: `HHMM` above is deliberately permissive, but the
 * draft was then PATCHed verbatim to /api/user/notification-preferences,
 * whose Zod schema requires a two-digit hour
 * (`/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/`). So "9:00" passed the client
 * check, 400'd on the server, and the user got a bare "Save failed" — a
 * dead end with nothing to act on, since "9:00" IS valid 24-hour time.
 * Normalising (rather than tightening the regex) keeps the forgiving input
 * and satisfies the server.
 *
 * Values this cannot parse are returned trimmed and unchanged — rejecting
 * them is `HHMM`'s job, which runs first.
 */
export function normaliseHHMM(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(trimmed);
  const hours = match?.[1];
  const minutes = match?.[2];
  if (!hours || !minutes) return trimmed;
  return `${hours.padStart(2, '0')}:${minutes}`;
}
