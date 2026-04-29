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

// Enhanced schema for job editing with AI features
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
    priority: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
    images: z.array(z.string().url()).optional(),
    requirements: z.array(z.string()).optional(),
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
