/**
 * Should the contractor see `properties.key_safe_code` for this job?
 *
 * Background
 * ----------
 * Migration 20260520000003 (the one that added `key_safe_code` etc. to
 * `properties`) calls out the product rule explicitly:
 *
 *   "Lock-box code is revealed to the contractor within 1h of the
 *    scheduled job start, not on contract acceptance."
 *
 * The web UI surfaces the same promise to the homeowner in
 * `MintEditorialPropertyAccess.tsx` ("Lock-box code reveals 1 hour
 * before your scheduled start").
 *
 * The contractor page used to gate on `stage === 'ready_to_start' ||
 * 'in_progress'`. `ready_to_start` fires the moment escrow funds —
 * which is often DAYS before the scheduled visit. That's a real
 * privacy regression vs the documented rule.
 *
 * Rules
 * -----
 *   1. Contractor must be the assigned contractor on the job (caller
 *      pre-checks; we don't validate here).
 *   2. Job must be in `assigned` or `in_progress` lifecycle status.
 *      `assigned` covers the pre-start window; `in_progress` covers
 *      the active visit.
 *   3. If the job has `scheduled_start_date`:
 *        reveal IF now() >= scheduled_start - 1h
 *      (also true once the job is in_progress regardless of clock,
 *      since the visit is in progress).
 *   4. If the job has no `scheduled_start_date` (the homeowner skipped
 *      scheduling): only reveal once the job hits `in_progress` —
 *      contractor confirms they're starting, we trust that signal.
 *      `assigned` without a schedule must NOT leak the code.
 *
 * The reveal window is generous (1h before to job completion) so
 * contractors who arrive a few minutes early can still get the code.
 * Travel-tracking + the `started_at` lifecycle column would let us
 * tighten this further (e.g. only after the contractor is within
 * 500m of the property), but 1h matches the documented promise and
 * doesn't require new instrumentation.
 */

const ONE_HOUR_MS = 60 * 60 * 1000;

export interface KeySafeRevealInputs {
  /** Job lifecycle column. */
  status: string | null | undefined;
  /** ISO timestamp when the visit is scheduled to start. Nullable. */
  scheduled_start_date: string | null | undefined;
  /** Optional override for "now" — used by tests. */
  now?: Date;
}

export function canRevealKeySafeCode(input: KeySafeRevealInputs): boolean {
  const { status, scheduled_start_date, now = new Date() } = input;

  // Contractors stop seeing the code as soon as the job leaves the
  // active stages. Completed / cancelled / disputed all hide it.
  if (status === 'in_progress') return true;
  if (status !== 'assigned') return false;

  if (!scheduled_start_date) {
    // No schedule → don't reveal until the contractor explicitly
    // starts the visit (status moves to in_progress).
    return false;
  }

  const scheduledMs = new Date(scheduled_start_date).getTime();
  if (!Number.isFinite(scheduledMs)) return false;

  // Inside the 1h pre-visit window OR after the scheduled time has
  // already passed (contractor running late — still legitimate to
  // see the code).
  return now.getTime() >= scheduledMs - ONE_HOUR_MS;
}
