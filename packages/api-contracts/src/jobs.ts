/**
 * Job API contracts.
 *
 * IMPORTANT: this file used to drift from the real `/api/jobs` POST
 * route — the audit (2026-04-28) caught fields the route accepts that
 * weren't here, and field names that didn't match. The contract below
 * now mirrors `apps/web/app/api/jobs/route.ts` exactly:
 *
 *   - title:        min 5 chars (was min 1)
 *   - description:  min 20 chars (was min 50, blocked silver-mode)
 *   - category:     enum from JOB_CATEGORIES (was free string)
 *   - photoUrls:    string-array key (was `images`, max 20 not 10)
 *   - urgency + priority: both accepted, priority normalised to urgency
 *   - location:     plain string (route uses sanitiseText, not the
 *                   structured object form this file used to ship)
 *   - is_rental_property + tenancy_metadata: R6 #19 fields
 *
 * Until the route imports this schema directly (a separate refactor),
 * keep these two definitions in lock-step.
 */
import { z } from 'zod';

// ── Constants ──────────────────────────────────────────────────────

export const JOB_CATEGORIES = [
  'plumbing',
  'electrical',
  'hvac',
  'general',
  'appliance',
  'landscaping',
  'roofing',
  'painting',
  'carpentry',
  'cleaning',
  'flooring',
  'tiling',
  'plastering',
  'guttering',
  'fencing',
  'damp',
  'pest_control',
  'other',
  // 2026-02 additions — the real route accepts these too. Mobile screens
  // pick from the same constants, so this list must stay in sync.
  'heating',
  'gardening',
  'handyman',
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const URGENCY_LEVELS = ['low', 'medium', 'high', 'emergency'] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

// Mirrors `public.jobs.status` CHECK constraint
// (migrations 20260213040000 + 20260307100000):
//   ('draft', 'open', 'posted', 'assigned', 'in_progress',
//    'completed', 'cancelled')
//
// Canonical lifecycle in CLAUDE.md uses `posted → assigned →
// in_progress → completed` (also `cancelled`). `'open'` is a legacy
// alias kept because old rows + a few callers still emit it; the DB
// CHECK accepts both. New code should prefer `'posted'`.
//
// `'draft'` is reserved for organisation/landlord-portal job
// templates that aren't yet shared with contractors. Not exposed on
// the public marketplace.
export const JOB_STATUSES = [
  'draft',
  'open',
  'posted',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// ── Request schemas ────────────────────────────────────────────────

// 2026-05-21 audit: production accepted a title of
// `goggkgkgkfkllkgfkgkfl` (21 chars, keyboard mash). Length alone is
// not enough — we also need a content heuristic. Real titles either
// contain a space ("Boiler service", "Replace tap") or have a
// reasonable vowel distribution. A 20-char string with one vowel and
// no whitespace is overwhelmingly keyboard mash, not English.
const VOWEL_RE = /[aeiouy]/gi;
const isPlausibleTitle = (raw: string): boolean => {
  const t = raw.trim();
  if (t.length < 5) return false;
  // Must contain at least one ASCII letter — pure-symbol/digit titles
  // (e.g. "12345", "!!!!!") aren't job titles.
  if (!/[A-Za-z]/.test(t)) return false;
  // Multi-word titles are always fine: contractors post acronyms like
  // "EICR cert" or "PAT testing kit" and we don't want to reject them.
  if (/\s/.test(t)) return true;
  // Single-word title: require at least two vowels (counts duplicates,
  // so "boiler" passes on o+e; "Painting" passes on a+i; keyboard mash
  // like "goggkgkgkfkllkgfkgkfl" fails on its single 'o').
  const vowels = t.match(VOWEL_RE) ?? [];
  return vowels.length >= 2;
};

const baseJobSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be 200 characters or fewer')
    .refine(isPlausibleTitle, {
      message:
        'Title doesn’t look like a real description — add a couple of words about the job',
    }),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be 5000 characters or fewer')
    .optional(),
  status: z.string().max(50).optional(),
  category: z.enum(JOB_CATEGORIES).optional(),
  budget: z.coerce
    .number()
    .positive('Budget must be positive')
    .max(1_000_000, 'Budget cannot exceed £1,000,000')
    .optional(),
  budget_min: z.coerce.number().positive().max(1_000_000).optional(),
  budget_max: z.coerce.number().positive().max(1_000_000).optional(),
  show_budget_to_contractors: z.boolean().optional(),
  require_itemized_bids: z.boolean().optional(),
  location: z
    .string()
    .min(3, 'Location must be at least 3 characters')
    .max(256, 'Location must be 256 characters or fewer')
    .optional(),
  // Real route key — not `images`. Route caps at 20.
  photoUrls: z
    .array(z.string().url('Invalid image URL'))
    .max(20, 'Maximum 20 photos allowed')
    .optional(),
  requiredSkills: z.array(z.string().max(100)).max(10).optional(),
  property_id: z.string().uuid().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  // R6 #19 landlord / tenancy
  is_rental_property: z.boolean().optional(),
  payer_user_id: z.string().uuid().optional(),
  tenancy_metadata: z.record(z.string(), z.unknown()).optional(),
  // DB column. Mobile/web should send this directly.
  urgency: z.enum(URGENCY_LEVELS).optional(),
  // Deprecated alias for `urgency`. Older mobile builds send this name;
  // the route normalises priority -> urgency before persistence.
  priority: z.enum(URGENCY_LEVELS).optional(),
  // Per-job requirement flags (silver-mode `contractor_before_photos`
  // and future per-job toggles). Persists to jobs.requirements jsonb.
  // Live audit (2026-04-28) confirmed the column has 16 prod rows
  // already.
  requirements: z.record(z.string(), z.unknown()).optional(),
  // 2026-05-13 (Hire-Again loop closure): UUID of a contractor the
  // homeowner wants to re-engage. Set by the "Hire again" CTA on a
  // completed-job card and consumed by JobCreationService to fire a
  // direct, higher-priority "you've been invited" notification to
  // that contractor on top of the normal nearby-contractor broadcast.
  // Not persisted on the jobs row — purely a one-shot routing signal.
  preferred_contractor_id: z.string().uuid().optional(),
  // 2026-05-21 (Property Rooms Slice 1): optional list of
  // property_rooms.id values the job targets. Snapshotted into the
  // job_rooms table at post time so historical scope is stable across
  // later room edits. Empty/undefined means "no specific room scope"
  // (legacy behaviour preserved).
  room_ids: z.array(z.string().uuid()).max(20).optional(),
});

export const createJobRequestSchema = baseJobSchema.strict();

export const updateJobRequestSchema = baseJobSchema.partial().extend({
  id: z.string().uuid('Invalid job ID'),
  // Mirrors the live DB CHECK constraint exactly. Previously this
  // schema only allowed `('open','in_progress','completed','cancelled')`
  // which silently rejected legitimate transitions to `'posted'` or
  // `'assigned'` — both required by the canonical lifecycle.
  status: z.enum(JOB_STATUSES).optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().max(100).optional(),
  minBudget: z.coerce.number().positive().optional(),
  maxBudget: z.coerce.number().positive().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  search: z.string().max(200).optional(),
});

// ── File upload ────────────────────────────────────────────────────

export const fileUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'File name contains invalid characters'),
  fileType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ]),
  fileSize: z
    .number()
    .positive('File size must be positive')
    .max(10_485_760, 'File size exceeds 10MB limit'),
  folder: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid folder name')
    .optional(),
});

// ── Job analysis ───────────────────────────────────────────────────

export const jobAnalysisRequestSchema = z
  .object({
    title: z.string().max(200, 'Title too long').optional(),
    description: z.string().max(5000, 'Description too long').optional(),
    location: z.string().max(256, 'Location too long').optional(),
    imageUrls: z
      .array(z.string().url('Invalid image URL'))
      .max(10, 'Maximum 10 images allowed')
      .optional(),
  })
  .refine(
    (data) =>
      !!(
        data.title ||
        data.description ||
        (data.imageUrls && data.imageUrls.length > 0)
      ),
    {
      message: 'Title, description, or image URLs are required',
    }
  );

// ── Misc job schemas ───────────────────────────────────────────────

export const matchCommunicationSchema = z.object({
  contractorId: z.string().uuid('Invalid contractor ID'),
});

export const enableLocationSharingSchema = z.object({
  enabled: z.boolean().default(true),
});

// ── Response schemas ───────────────────────────────────────────────

export const jobResponseSchema = z.object({
  job: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      description: z.string().optional(),
      status: z.string(),
      category: z.string().optional(),
      budget: z.number().optional(),
      location: z.unknown().optional(),
      homeowner_id: z.string().uuid(),
      contractor_id: z.string().uuid().optional().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
    })
    .passthrough(),
});

export const jobListResponseSchema = z.object({
  jobs: z.array(
    z
      .object({
        id: z.string().uuid(),
        title: z.string(),
        status: z.string(),
        category: z.string().optional(),
        budget: z.number().optional(),
        created_at: z.string(),
      })
      .passthrough()
  ),
  nextCursor: z.string().optional(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;
export type UpdateJobRequest = z.infer<typeof updateJobRequestSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
export type JobResponse = z.infer<typeof jobResponseSchema>;
export type JobListResponse = z.infer<typeof jobListResponseSchema>;
export type JobAnalysisRequest = z.infer<typeof jobAnalysisRequestSchema>;
