/**
 * `JobView` — the canonical, single-shape representation of a job for
 * the UI / business-logic layer.
 *
 * # Why this exists (PKG-P1-4 / 2026-04-23 audit)
 *
 * The legacy `Job` interface in `./jobs.ts` carries BOTH snake_case AND
 * camelCase aliases for the same fields (e.g. `homeowner_id` AND
 * `homeownerId`, `created_at` AND `createdAt`). In practice exactly one
 * of each pair is populated, but the type marks both as optional, so
 * every consumer ends up writing `job.homeownerId ?? job.homeowner_id`
 * defensively. That defensive code IS the bug — it papers over the
 * underlying inconsistency rather than fixing it.
 *
 * `JobView` is the post-normalization shape:
 *   - All fields camelCase
 *   - Required fields are required (no surprise nulls on `id`/`status`/
 *     `createdAt`)
 *   - DB-only fields (`metadata` JSONB, `published_at` timestamp) are
 *     intentionally absent — those belong on a `JobRow` type that
 *     lives close to Supabase calls, not on the UI shape
 *
 * # How to migrate a caller
 *
 * Where today you have:
 *   const homeownerId = job.homeownerId ?? job.homeowner_id;
 *
 * Switch the call site to use `JobView` and run the supabase result
 * through `toJobView(row)` once at the API/service boundary:
 *
 *   const view: JobView = toJobView(row);
 *   const homeownerId = view.homeownerId;  // typed, never null
 *
 * Existing `Job` callers don't break — this is purely additive.
 *
 * # Bid normalization
 *
 * Bids in `./jobs.ts` have the same dual-shape problem (`job_id` vs
 * `jobId`, `contractor_id` vs `contractorId`). `BidView` + `toBidView`
 * mirror the same migration path.
 */

export type JobStatus =
  | 'draft'
  | 'posted'
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type JobUrgency = 'low' | 'medium' | 'high' | 'emergency';

/**
 * Lightweight contractor / homeowner profile snippet attached to a Job
 * via Supabase joins. Includes only the fields the UI actually renders.
 * Larger profile shapes belong on dedicated `User` / `ContractorProfile`
 * types — keep this minimal so a Job join doesn't accidentally over-
 * select.
 */
export interface JobPartyView {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  profileImageUrl?: string;
  rating?: number;
}

/**
 * Canonical UI-side job representation. ALL fields camelCase, ALL
 * required fields actually required, no DB-only fields.
 */
export interface JobView {
  id: string;
  title: string;
  description?: string;
  status: JobStatus;
  homeownerId: string;
  contractorId?: string;
  category?: string;
  subcategory?: string;
  urgency?: JobUrgency;
  budget?: number;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  city?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  completedAt?: string;
  homeowner?: JobPartyView;
  contractor?: JobPartyView;
}

/**
 * Canonical UI-side bid representation. Same conventions as `JobView`.
 */
export interface BidView {
  id: string;
  jobId: string;
  contractorId: string;
  amount: number;
  description?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  estimatedDurationDays?: number;
  materialsIncluded?: boolean;
  warrantyMonths?: number;
  createdAt: string;
  updatedAt?: string;
  contractor?: JobPartyView;
  job?: JobView;
}

// -------------------------------------------------------------------
// Normalizers — convert mixed-shape Supabase / Job / Bid rows into the
// canonical *View types. Accepts an unknown-shape row and a defensive
// any-style accessor pattern because Supabase result rows aren't typed
// strongly at the boundary.
// -------------------------------------------------------------------

type DualShapeJobRow = Record<string, unknown>;

function pickString(
  row: DualShapeJobRow,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function pickNumber(
  row: DualShapeJobRow,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function pickStringArray(
  row: DualShapeJobRow,
  ...keys: string[]
): string[] | undefined {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value as string[];
    }
  }
  return undefined;
}

function normalizeParty(value: unknown): JobPartyView | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const r = value as DualShapeJobRow;
  const id = pickString(r, 'id');
  if (!id) return undefined;
  return {
    id,
    firstName: pickString(r, 'firstName', 'first_name'),
    lastName: pickString(r, 'lastName', 'last_name'),
    companyName: pickString(r, 'companyName', 'company_name'),
    profileImageUrl: pickString(r, 'profileImageUrl', 'profile_image_url'),
    rating: pickNumber(r, 'rating'),
  };
}

/**
 * Convert any row shape (legacy `Job`, raw Supabase row, mixed) into a
 * `JobView`. Throws when the required fields (`id`, `status`,
 * `homeowner_id` / `homeownerId`, `created_at` / `createdAt`,
 * `updated_at` / `updatedAt`, `title`) are missing — those genuinely
 * indicate a malformed row that shouldn't reach the UI.
 */
export function toJobView(row: unknown): JobView {
  if (!row || typeof row !== 'object') {
    throw new Error('toJobView: input is not an object');
  }
  const r = row as DualShapeJobRow;

  const id = pickString(r, 'id');
  const title = pickString(r, 'title');
  const status = pickString(r, 'status') as JobStatus | undefined;
  const homeownerId = pickString(r, 'homeownerId', 'homeowner_id');
  const createdAt = pickString(r, 'createdAt', 'created_at');
  const updatedAt = pickString(r, 'updatedAt', 'updated_at');

  if (!id) throw new Error('toJobView: missing `id`');
  if (!title) throw new Error('toJobView: missing `title`');
  if (!status) throw new Error('toJobView: missing `status`');
  if (!homeownerId) throw new Error('toJobView: missing `homeowner_id`');
  if (!createdAt) throw new Error('toJobView: missing `created_at`');
  if (!updatedAt) throw new Error('toJobView: missing `updated_at`');

  // Location can be a JSONB object or a plain string in the legacy
  // schema. Stringify objects to a single best-guess representation.
  let location: string | undefined;
  const rawLocation = r.location;
  if (typeof rawLocation === 'string') {
    location = rawLocation;
  } else if (rawLocation && typeof rawLocation === 'object') {
    const lr = rawLocation as DualShapeJobRow;
    location = pickString(lr, 'address', 'fullAddress', 'name');
  }

  return {
    id,
    title,
    description: pickString(r, 'description'),
    status,
    homeownerId,
    contractorId: pickString(r, 'contractorId', 'contractor_id'),
    category: pickString(r, 'category'),
    subcategory: pickString(r, 'subcategory'),
    urgency: pickString(r, 'urgency', 'priority') as JobUrgency | undefined,
    budget: pickNumber(r, 'budget'),
    budgetMin: pickNumber(r, 'budgetMin', 'budget_min'),
    budgetMax: pickNumber(r, 'budgetMax', 'budget_max'),
    location,
    city: pickString(r, 'city'),
    postcode: pickString(r, 'postcode'),
    latitude: pickNumber(r, 'latitude'),
    longitude: pickNumber(r, 'longitude'),
    photos: pickStringArray(r, 'photos', 'images', 'photoUrls'),
    createdAt,
    updatedAt,
    publishedAt: pickString(r, 'publishedAt', 'published_at'),
    completedAt: pickString(r, 'completedAt', 'completed_at'),
    homeowner: normalizeParty(r.homeowner),
    contractor: normalizeParty(r.contractor),
  };
}

/**
 * Convert any row shape into a `BidView`. Same conventions + same
 * fail-loud behaviour for the required fields as `toJobView`.
 */
export function toBidView(row: unknown): BidView {
  if (!row || typeof row !== 'object') {
    throw new Error('toBidView: input is not an object');
  }
  const r = row as DualShapeJobRow;

  const id = pickString(r, 'id');
  const jobId = pickString(r, 'jobId', 'job_id');
  const contractorId = pickString(r, 'contractorId', 'contractor_id');
  const amount = pickNumber(r, 'amount');
  const status = pickString(r, 'status') as BidView['status'] | undefined;
  const createdAt = pickString(r, 'createdAt', 'created_at');

  if (!id) throw new Error('toBidView: missing `id`');
  if (!jobId) throw new Error('toBidView: missing `job_id`');
  if (!contractorId) throw new Error('toBidView: missing `contractor_id`');
  if (amount === undefined) throw new Error('toBidView: missing `amount`');
  if (!status) throw new Error('toBidView: missing `status`');
  if (!createdAt) throw new Error('toBidView: missing `created_at`');

  return {
    id,
    jobId,
    contractorId,
    amount,
    description: pickString(r, 'description', 'message'),
    status,
    estimatedDurationDays: pickNumber(
      r,
      'estimatedDurationDays',
      'estimated_duration_days'
    ),
    materialsIncluded:
      r.materialsIncluded === true || r.materials_included === true,
    warrantyMonths: pickNumber(r, 'warrantyMonths', 'warranty_months'),
    createdAt,
    updatedAt: pickString(r, 'updatedAt', 'updated_at'),
    contractor: normalizeParty(r.contractor),
    job: r.job ? toJobView(r.job) : undefined,
  };
}
