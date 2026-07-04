export interface DatabaseError {
  code?: string;
  message?: string;
}

/**
 * Contractor profile row returned by `getContractorProfile`.
 *
 * 2026-07-04: the legacy contractor-profiles side table is RETIRED
 * (it only ever carried `id, stripe_*, subscription_*, hourly_rate`
 * and holds 0 rows). Every field below is sourced from canonical
 * `profiles` via `/api/contractor/profile-data` — including
 * `hourly_rate`, which now reads `profiles.hourly_rate` — or doesn't
 * exist as a column yet.
 *
 * Field-by-field source-of-truth comments inline. Anything tagged
 * "**Not yet in DB**" returns `[]` / `undefined` from the API and
 * the screens fall back gracefully.
 */
export interface DatabaseContractorProfileRow {
  /** `profiles.id`. */
  id: string;
  /** Mirror of `id` for callers that pre-date the column rename. */
  user_id: string;
  /** `profiles.company_name`. */
  company_name?: string;
  /** Currently unused — `profiles.profile_image_url` is the avatar. */
  company_logo?: string;
  /** `profiles.bio`. */
  bio?: string;
  /** Mapped from `profiles.address` — there's no separate
   *  `business_address` column; the contractor's home and trade
   *  address have always been the same column. */
  business_address?: string;
  /** `profiles.hourly_rate`. */
  hourly_rate?: number;
  /** **Not yet in DB.** Returned as `undefined` from the API. */
  years_experience?: number;
  /** **Not yet in DB.** Returned as `undefined` from the API. */
  service_radius?: number;
  /** **Not yet in DB.** Returned as `undefined` from the API. */
  availability?: 'immediate' | 'this_week' | 'this_month' | 'busy';
  /** `profiles.portfolio_images` (added in migration 20260208000000). */
  portfolio_images?: string[];
  /** **Not yet in DB.** Returned as `[]` from the API. */
  specialties?: string[];
  /** **Not yet in DB.** Returned as `[]` from the API. */
  certifications?: string[];
  /** `profiles.license_number`. */
  license_number?: string;
  /** **Not yet in DB.** Stored on `contractor_insurance` table —
   *  use `/api/contractor/business-profile` for insurance data. */
  insurance_provider?: string;
  /** **Not yet in DB.** Same caveat as `insurance_provider`. */
  insurance_policy?: string;
  /** `profiles.insurance_expiry_date`. */
  insurance_expiry?: string;
  /** `profiles.latitude`. */
  latitude?: number;
  /** `profiles.longitude`. */
  longitude?: number;
  created_at: string;
  updated_at: string;
  user?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface DatabaseUserRow {
  id: string;
  email?: string; // not selected on cross-user reads (PII protection)
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  created_at: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
  profile_image_url?: string;
  bio?: string;
  rating?: number;
  total_jobs_completed?: number;
  is_available?: boolean;
  contractor_skills?: DatabaseSkillRow[];
  reviews?: DatabaseReviewRow[];
}

export interface DatabaseSkillRow {
  id: string;
  contractor_id: string;
  skill_name: string;
  created_at: string;
}

export interface DatabaseReviewRow {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    first_name?: string;
    last_name?: string;
  };
}

interface DatabaseMatchRow {
  id: string;
  homeowner_id: string;
  contractor_id: string;
  action: string;
  created_at: string;
  contractor?: DatabaseUserRow;
}
