import { z } from 'zod';
import type { JobDetail } from '@mintenance/types/src/contracts';
import { sanitizeText, sanitizeJobDescription } from '@/lib/sanitizer';

// Mirror the state-machine's enum (the actual transitions live in
// `@mintenance/shared/state-machines/job-state-machine`). The Zod
// schema below previously accepted any string for `status`, which let
// clients submit values the state machine has no rule for and made
// the validation error message late + ugly. Constraining at the
// schema layer fails fast with a clear field-level error instead.
//
// `'draft'` / `'open'` are accepted by the live DB CHECK but the
// canonical lifecycle (CLAUDE.md) and state machine don't transition
// to them — they're legacy holdouts and should never be a *target*
// status of a PATCH. We deliberately omit them here.
const JOB_STATUS_TRANSITION_TARGETS = [
  'posted',
  'assigned',
  'in_progress',
  'completed',
  'disputed',
  'cancelled',
] as const;

export interface Params {
  params: Promise<{ id: string }>;
}

interface JobAttachment {
  id: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
}

export const jobSelectFields =
  'id,title,description,status,homeowner_id,contractor_id,category,budget,created_at,updated_at';

export type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  homeowner_id: string;
  contractor_id?: string | null;
  category?: string | null;
  budget?: number | null;
  created_at: string;
  updated_at: string;
};

export const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobDetail['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Enhanced schema for job editing with AI features.
 *
 * Audit step 4 finish (2026-04-29): aligned with the create-route
 * schema (`@mintenance/api-contracts.createJobRequestSchema`) and
 * the live DB columns:
 *
 *   - `urgency` is the canonical field name (matches the
 *     `jobs.urgency` DB column + the shared create schema).
 *     `priority` is kept as a deprecated alias so the existing web
 *     edit page (`apps/web/app/jobs/[id]/edit/page.tsx`) keeps
 *     working through the rename — the handler coalesces them.
 *   - `photoUrls` matches the create-route shape; `images` is the
 *     legacy alias the edit page still sends.
 *   - `requirements` is now `record(string, unknown)` to match the
 *     `jobs.requirements` jsonb column. Sending an array still
 *     parses as JSON but the type was lying — record matches the
 *     create route + the live data.
 *
 * Pre-fix bug: the handler wrote `updatePayload.priority` to
 * `jobs.priority`, but that column doesn't exist (the column is
 * `urgency`). PostgreSQL silently ignored the unknown column on
 * update so every "edit job urgency" save was a no-op while the UI
 * showed "saved successfully". Closed in this commit by writing to
 * `urgency` and reading from either alias.
 */
export const updateJobSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .optional()
      .transform((val) => (val ? sanitizeText(val, 200) : val)),
    description: z
      .string()
      .max(5000)
      .optional()
      .transform((val) => (val ? sanitizeJobDescription(val) : val)),
    status: z.enum(JOB_STATUS_TRANSITION_TARGETS).optional(),
    category: z
      .string()
      .max(128)
      .optional()
      .transform((val) => (val ? sanitizeText(val, 128) : val)),
    budget: z.coerce.number().positive().optional(),
    // New fields for comprehensive job editing
    budgetMin: z.coerce.number().positive().optional(),
    budgetMax: z.coerce.number().positive().optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    propertyType: z.string().optional(),
    accessInfo: z.string().optional(),
    // Canonical name matching the DB column + create schema.
    urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
    // Deprecated alias — older callers (the web edit page) send
    // `priority` from a UI field still named that way. The handler
    // coalesces `urgency ?? priority` before writing.
    priority: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
    // Canonical name matching the create schema.
    photoUrls: z.array(z.string().url()).optional(),
    // Deprecated alias — older callers send `images`.
    images: z.array(z.string().url()).optional(),
    // jsonb on the live DB; matches the create-route shape.
    requirements: z.record(z.string(), z.unknown()).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    flexibleTimeline: z.boolean().optional(),
    // AI analysis options
    analyzeWithAI: z.boolean().default(true),
    runBuildingSurvey: z.boolean().default(false),
  })
  .refine((data: Record<string, unknown>) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
