/**
 * contractorBadges — pure utility that computes the Phase 3
 * trust-badge ladder from a contractor profile row.
 *
 * Per PDF §5.5 of the 2026-04-19 mobile onboarding audit:
 *
 *   | Badge          | Unlocked by                                  |
 *   |----------------|----------------------------------------------|
 *   | Verified       | Tier 1 complete (ID + background + selfie)   |
 *   | Insured        | Insurance certificate on file + non-expired  |
 *   | Licenced       | Trade-specific licence on file + non-expired |
 *   | DBS Checked    | Valid DBS certificate                        |
 *   | Preferred Pro  | 10+ jobs, 4.5+ rating, <2% dispute rate      |
 *                    | over trailing 90 days                        |
 *
 * What this utility covers today
 * -------------------------------
 * - Verified, Licenced, Preferred Pro — all computable from
 *   existing columns on `profiles`.
 * - Insured, DBS Checked — schema columns don't exist yet
 *   (see live-DB check 2026-04-21). We still list their
 *   badge definitions below so callers can discover the full
 *   ladder, but `computeContractorBadges` never emits them
 *   until the columns land. A follow-up migration adds
 *   profiles.insurance_expiry + profiles.dbs_expiry and flips
 *   these on.
 *
 * What the dispute-rate check simplifies
 * ---------------------------------------
 * There's no `dispute_rate` column. Preferred Pro currently
 * uses total_jobs_completed + rating only. A future commit
 * can query disputes over the trailing 90 days; that's a
 * join, not a column, so it stays out of this pure utility.
 *
 * Shape
 * -----
 * The utility returns an ordered array so callers can render
 * badges in a canonical sequence without re-sorting. Order
 * follows the PDF's ladder top-to-bottom (most fundamental
 * first).
 */

export type ContractorBadgeId =
  | 'verified'
  | 'insured'
  | 'licenced'
  | 'dbs_checked'
  | 'preferred_pro';

export interface ContractorBadgeDef {
  id: ContractorBadgeId;
  label: string;
  /** Short visibility-boost explanation shown on hover / tap. */
  description: string;
  /** Ionicons name for the badge icon. */
  iconName: string;
}

/**
 * Canonical badge registry. Order here is the display order.
 */
export const BADGE_DEFS: ReadonlyArray<ContractorBadgeDef> = [
  {
    id: 'verified',
    label: 'Verified',
    description:
      'Identity confirmed and background check cleared. Minimum bar to bid.',
    iconName: 'shield-checkmark',
  },
  {
    id: 'insured',
    label: 'Insured',
    description:
      'Public liability insurance on file. Required for jobs over £500.',
    iconName: 'umbrella',
  },
  {
    id: 'licenced',
    label: 'Licenced',
    description:
      'Trade licence verified. Required for regulated work (gas, electrics).',
    iconName: 'ribbon',
  },
  {
    id: 'dbs_checked',
    label: 'DBS Checked',
    description:
      'Enhanced DBS check on file. Preferred for tenant-occupied jobs.',
    iconName: 'lock-closed',
  },
  {
    id: 'preferred_pro',
    label: 'Preferred Pro',
    description:
      '10+ jobs with a 4.5★ rating and low disputes. Ranks first in search.',
    iconName: 'star',
  },
];

/**
 * Minimal shape of the contractor profile fields this utility
 * reads. Deliberately narrower than the full User type so the
 * utility stays decoupled from auth state and query plumbing.
 */
export interface ContractorBadgeInput {
  admin_verified: boolean | null | undefined;
  verification_status: string | null | undefined;
  background_check_status: string | null | undefined;
  license_type: string | null | undefined;
  license_expiry: string | null | undefined;
  rating: number | null | undefined;
  total_jobs_completed: number | null | undefined;
  /**
   * Optional future-use fields. Safe to omit — we fall back to
   * 'badge not earned' when they're missing, so callers that
   * don't fetch them get the same result as today.
   */
  insurance_expiry?: string | null;
  dbs_expiry?: string | null;
}

function isValidFutureDate(
  value: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return parsed > now.getTime();
}

/**
 * Verified = admin_verified = true AND background_check_status
 * = 'verified'. Either alone isn't enough — admin_verified is a
 * manual toggle, background_check_status is the third-party
 * SLA result. The PDF requires BOTH to claim the base "Verified"
 * badge.
 */
function isVerified(p: ContractorBadgeInput): boolean {
  return p.admin_verified === true && p.background_check_status === 'verified';
}

/**
 * Licenced = a licence type is selected AND the expiry is in
 * the future (or unset — some trades issue lifetime licences).
 * A lapsed expiry should un-earn the badge automatically.
 */
function isLicenced(p: ContractorBadgeInput, now: Date = new Date()): boolean {
  if (!p.license_type) return false;
  // Expiry unset = treat as indefinite (some trades don't expire).
  if (!p.license_expiry) return true;
  return isValidFutureDate(p.license_expiry, now);
}

/**
 * Insured = insurance_expiry in the future. If the column
 * doesn't exist on the row yet (field undefined), no badge.
 */
function isInsured(p: ContractorBadgeInput, now: Date = new Date()): boolean {
  if (p.insurance_expiry === undefined) return false;
  return isValidFutureDate(p.insurance_expiry, now);
}

/** DBS Checked = dbs_expiry in the future. Same shape as Insured. */
function isDbsChecked(
  p: ContractorBadgeInput,
  now: Date = new Date()
): boolean {
  if (p.dbs_expiry === undefined) return false;
  return isValidFutureDate(p.dbs_expiry, now);
}

/**
 * Preferred Pro = 10+ jobs completed AND rating >= 4.5. The
 * PDF's <2% dispute rate over trailing 90 days is omitted
 * today because we have no dispute_rate column or a cheap
 * way to derive it in this pure function. A follow-up can
 * gate the badge on an additional dispute_rate input without
 * changing the badge's public meaning.
 */
function isPreferredPro(p: ContractorBadgeInput): boolean {
  const rating = p.rating ?? 0;
  const jobs = p.total_jobs_completed ?? 0;
  return jobs >= 10 && rating >= 4.5;
}

/**
 * Compute the ordered list of earned badges for a contractor
 * profile. Returns an empty array if no badges are earned.
 *
 * Pure — no side effects, no network, safe to call repeatedly.
 * Accepts an optional `now` for deterministic unit tests.
 */
export function computeContractorBadges(
  profile: ContractorBadgeInput,
  now: Date = new Date()
): ContractorBadgeDef[] {
  const earned: ContractorBadgeId[] = [];
  if (isVerified(profile)) earned.push('verified');
  if (isInsured(profile, now)) earned.push('insured');
  if (isLicenced(profile, now)) earned.push('licenced');
  if (isDbsChecked(profile, now)) earned.push('dbs_checked');
  if (isPreferredPro(profile)) earned.push('preferred_pro');
  return BADGE_DEFS.filter((d) => earned.includes(d.id));
}

/** Returns the next badge the contractor hasn't earned yet. */
export function nextUnearnedBadge(
  profile: ContractorBadgeInput,
  now: Date = new Date()
): ContractorBadgeDef | null {
  const earnedIds = new Set(
    computeContractorBadges(profile, now).map((b) => b.id)
  );
  return BADGE_DEFS.find((d) => !earnedIds.has(d.id)) ?? null;
}
