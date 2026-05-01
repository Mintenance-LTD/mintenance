/**
 * Shared `JobDraft` model + adapter — the missing piece for the
 * 2026-04-30 audit P1 finding "Job Creation Has Too Many Entry Points
 * With Different Behavior".
 *
 * Background
 * ----------
 * The platform has 7 job-creation entry points:
 *   - Web: `/jobs/create`, `/jobs/quick-create`, `/jobs/new/wizard`
 *   - Mobile: `JobPosting`, `PostJobWizard`, `QuickJobPost`,
 *     `ServiceRequest`
 *
 * All seven submit to `POST /api/jobs`, which validates against
 * `createJobRequestSchema`. The audit complaint was that each form
 * still owned its own field-collection + pre-validation logic that
 * could drift from the canonical schema. The fix is one shared draft
 * shape + one adapter that maps from draft → wire payload, so:
 *
 *   1. Forms collect input into a `JobDraft` (looser than wire — empty
 *      strings, partial fields, raw photo URIs are all acceptable
 *      while the user is still editing).
 *   2. `validateJobDraft(draft)` runs the SAME Zod schema the route
 *      enforces, so client-side errors match server-side errors
 *      exactly.
 *   3. `toCreateJobRequest(draft)` returns a typed
 *      `CreateJobRequest` payload, normalising aliases (e.g. legacy
 *      `priority` -> `urgency`) and trimming/coercing fields.
 *
 * Adopting this in each entry point is a per-screen migration; the
 * shared types live here so a single source of truth exists, and new
 * entry points have one obvious thing to import.
 */
import { z } from 'zod';

import {
  createJobRequestSchema,
  JOB_CATEGORIES,
  URGENCY_LEVELS,
  type CreateJobRequest,
  type JobCategory,
  type Urgency,
} from './jobs';

// ── Form-level draft model ─────────────────────────────────────────

/**
 * The richest superset of fields any of the 7 entry points collects.
 * Most fields are optional because different surfaces gather different
 * subsets (Quick Create skips photos; Service Request gates on
 * category; the full wizard collects everything).
 *
 * Empty strings are normalised to `undefined` by `toCreateJobRequest`
 * so the wire payload is always well-formed even when forms keep
 * controlled-input state at `''`.
 */
export interface JobDraft {
  title?: string;
  description?: string;
  category?: JobCategory | '';
  urgency?: Urgency;
  /** Legacy alias kept for older mobile builds. Adapter normalises. */
  priority?: Urgency;
  budget?: number | string;
  budgetMin?: number | string;
  budgetMax?: number | string;
  showBudgetToContractors?: boolean;
  requireItemizedBids?: boolean;
  location?: string;
  latitude?: number | string;
  longitude?: number | string;
  /** URLs (NOT raw `file://` URIs). Upload step happens before adapt. */
  photoUrls?: string[];
  requiredSkills?: string[];
  propertyId?: string;
  // R6 #19 — landlord / tenancy
  isRentalProperty?: boolean;
  payerUserId?: string;
  tenancyMetadata?: Record<string, unknown>;
  // Per-job toggles (silver-mode `contractor_before_photos`, etc.)
  requirements?: Record<string, unknown>;
  // Saved-as-draft path uses 'draft'; live posts use 'posted'.
  status?: 'draft' | 'posted' | 'open';
}

// ── Validation ─────────────────────────────────────────────────────

const isValidCategory = (v: unknown): v is JobCategory =>
  typeof v === 'string' && (JOB_CATEGORIES as readonly string[]).includes(v);

const isValidUrgency = (v: unknown): v is Urgency =>
  typeof v === 'string' && (URGENCY_LEVELS as readonly string[]).includes(v);

const trimToUndefined = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
};

const numberOrUndefined = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Convert a form-level draft into the canonical wire payload accepted
 * by `POST /api/jobs`. This is the ONLY place legacy aliasing,
 * trimming, and empty-string normalisation lives — every entry point
 * should call it before posting.
 */
export function toCreateJobRequest(draft: JobDraft): CreateJobRequest {
  // Urgency / priority aliasing — server normalises priority -> urgency,
  // but standardising client-side keeps the payload clean and lets the
  // adapter return a properly typed CreateJobRequest.
  const rawUrgency = isValidUrgency(draft.urgency)
    ? draft.urgency
    : isValidUrgency(draft.priority)
      ? draft.priority
      : undefined;

  const rawCategory =
    draft.category && isValidCategory(draft.category)
      ? draft.category
      : undefined;

  const photoUrls =
    Array.isArray(draft.photoUrls) && draft.photoUrls.length > 0
      ? draft.photoUrls
          .map((u) => trimToUndefined(u))
          .filter((u): u is string => typeof u === 'string')
      : undefined;

  const requiredSkills =
    Array.isArray(draft.requiredSkills) && draft.requiredSkills.length > 0
      ? draft.requiredSkills
          .map((s) => trimToUndefined(s))
          .filter((s): s is string => typeof s === 'string')
      : undefined;

  const payload: CreateJobRequest = {
    title: trimToUndefined(draft.title) ?? '',
    description: trimToUndefined(draft.description),
    status: draft.status,
    category: rawCategory,
    budget: numberOrUndefined(draft.budget),
    budget_min: numberOrUndefined(draft.budgetMin),
    budget_max: numberOrUndefined(draft.budgetMax),
    show_budget_to_contractors: draft.showBudgetToContractors,
    require_itemized_bids: draft.requireItemizedBids,
    location: trimToUndefined(draft.location),
    photoUrls,
    requiredSkills:
      requiredSkills && requiredSkills.length > 0 ? requiredSkills : undefined,
    property_id: trimToUndefined(draft.propertyId),
    latitude: numberOrUndefined(draft.latitude),
    longitude: numberOrUndefined(draft.longitude),
    is_rental_property: draft.isRentalProperty,
    payer_user_id: trimToUndefined(draft.payerUserId),
    tenancy_metadata: draft.tenancyMetadata,
    urgency: rawUrgency,
    requirements: draft.requirements,
  };

  // Strip undefined keys so the JSON payload doesn't carry empty
  // fields that could surface as "null" on the route side.
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  ) as CreateJobRequest;
}

/**
 * Validate a draft against the canonical wire schema. Returns the
 * parsed payload on success or a flat list of `{ field, message }`
 * tuples on failure (suitable for inline UI form errors).
 *
 * Forms should call this BEFORE posting. The route runs the same
 * `createJobRequestSchema` server-side, so validation errors here
 * mirror what the server would have rejected — no surprise 400s
 * after the user taps Submit.
 */
export function validateJobDraft(
  draft: JobDraft
):
  | { ok: true; payload: CreateJobRequest }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const candidate = toCreateJobRequest(draft);
  const result = createJobRequestSchema.safeParse(candidate);
  if (result.success) {
    return { ok: true, payload: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })),
  };
}

// ── Re-exports for convenience ─────────────────────────────────────

export {
  JOB_CATEGORIES,
  URGENCY_LEVELS,
  createJobRequestSchema,
  type CreateJobRequest,
  type JobCategory,
  type Urgency,
};

// Lightweight Zod-style schema for runtime validation of arbitrary
// draft objects (e.g. when restoring from local storage). Most callers
// should use `validateJobDraft` directly — this is the building block.
export const jobDraftSchema: z.ZodType<JobDraft> = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.union([z.enum(JOB_CATEGORIES), z.literal('')]).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  priority: z.enum(URGENCY_LEVELS).optional(),
  budget: z.union([z.number(), z.string()]).optional(),
  budgetMin: z.union([z.number(), z.string()]).optional(),
  budgetMax: z.union([z.number(), z.string()]).optional(),
  showBudgetToContractors: z.boolean().optional(),
  requireItemizedBids: z.boolean().optional(),
  location: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
  photoUrls: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  propertyId: z.string().optional(),
  isRentalProperty: z.boolean().optional(),
  payerUserId: z.string().optional(),
  tenancyMetadata: z.record(z.string(), z.unknown()).optional(),
  requirements: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'posted', 'open']).optional(),
});
