import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Early-access cohort — the first N homeowners to sign up.
 *
 * These users may post jobs without completing PHONE verification, so
 * the first cohort isn't stranded behind a gate during the beta. They
 * must still have a phone NUMBER on file — an assigned contractor has
 * to be able to reach the customer, and that is the thing phone
 * verification was really protecting. Skipping the SMS round-trip is
 * the concession; going unreachable is not.
 *
 * Email verification still applies, and contractor-side gates (admin
 * review, subscription) are untouched.
 *
 * WHY A COHORT RATHER THAN AN ENV FLAG
 * ------------------------------------
 * A `BETA_OPEN_ACCESS=true`-style switch has to be remembered and
 * turned off, and this codebase already has the scar to prove that
 * doesn't happen: `SKIP_PHONE_VERIFICATION` sat on the production
 * project silently disabling the gate until audit P0.1 (2026-05-10)
 * locked it out of prod. A cohort rule expires on its own — homeowner
 * #51 is gated with no deploy, no env change, and nothing to forget.
 *
 * MEMBERSHIP IS STABLE
 * --------------------
 * Rank = the number of homeowners who signed up strictly BEFORE you.
 * Nobody can be inserted into the past, so a user's rank never rises:
 * a homeowner who could post yesterday can still post today. Only
 * deleting an earlier homeowner moves the boundary, and only in the
 * permissive direction.
 */

/**
 * Size of the waived cohort. Lowering this can re-gate homeowners who
 * were previously waived — raising it is always safe.
 */
export const EARLY_ACCESS_COHORT_SIZE = 50;

/**
 * True when the homeowner who signed up at `profileCreatedAt` is among
 * the first {@link EARLY_ACCESS_COHORT_SIZE} homeowners.
 *
 * Fails CLOSED: any query error or missing timestamp reports "not in
 * cohort", so a database blip re-imposes verification rather than
 * opening the gate to everyone.
 */
export async function isInEarlyAccessCohort(
  profileCreatedAt: string | null | undefined
): Promise<boolean> {
  if (!profileCreatedAt) {
    return false;
  }

  // `head: true` makes this a COUNT — no rows cross the wire. Ties on
  // an identical created_at would let one extra homeowner in; the
  // timestamps are microsecond-resolution, so this is theoretical, and
  // the failure direction is one bonus beta user rather than a gate
  // that stops working.
  const { count, error } = await serverSupabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'homeowner')
    .lt('created_at', profileCreatedAt);

  if (error) {
    logger.error('Early-access cohort check failed', error, {
      service: 'EarlyAccessCohort',
    });
    return false;
  }

  return (count ?? EARLY_ACCESS_COHORT_SIZE) < EARLY_ACCESS_COHORT_SIZE;
}

/** The profile columns the waiver policy depends on. */
export interface EarlyAccessProfile {
  role?: string | null;
  phone?: string | null;
  phone_verified?: boolean | null;
  created_at?: string | null;
}

/**
 * The complete waiver policy, in one place so the job-posting gate,
 * the verification-status endpoint and the profile endpoint can't
 * drift apart on who still owes a verification.
 *
 * A homeowner is waived when ALL of:
 *   - they haven't already verified (otherwise there's nothing to waive)
 *   - they have a phone NUMBER on file, so contractors can reach them
 *   - they're inside the early-access cohort by signup rank
 *
 * A homeowner with no number is NOT waived — they get the normal
 * "verify your phone" prompt, which is also the flow that collects a
 * number in the first place (and opens the mobile in-flow modal).
 */
export async function isPhoneVerificationWaivedFor(
  profile: EarlyAccessProfile
): Promise<boolean> {
  if (profile.role !== 'homeowner') {
    return false;
  }
  if (profile.phone_verified) {
    return false;
  }
  if (!profile.phone?.trim()) {
    return false;
  }
  return isInEarlyAccessCohort(profile.created_at);
}
