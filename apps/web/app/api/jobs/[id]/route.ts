import { withApiHandler } from '@/lib/api/with-api-handler';
import { handleGet } from './_handlers/get';
import { handlePut } from './_handlers/put';
import { handlePatch } from './_handlers/patch';
import { handleDelete } from './_handlers/delete';

export const GET = withApiHandler({ csrf: false }, handleGet);

/**
 * PUT /api/jobs/[id] - Update job with comprehensive AI analysis
 */
export const PUT = withApiHandler({ roles: ['homeowner'] }, handlePut);

/**
 * PATCH /api/jobs/[id] — partial update (homeowner only).
 *
 * WBE-P1-1: previously bypassed withApiHandler with manual auth + CSRF.
 *
 * PATCH writes the lightweight job fields:
 *   title, description, status, category, budget, urgency,
 *   location, city, postcode, access_info, requirements,
 *   budget_min, budget_max, start_date, end_date,
 *   flexible_timeline,
 * plus `photoUrls` / `images` through a `job_attachments` rebuild.
 *
 * Schema fields that PATCH does NOT persist:
 *   - `propertyType` — context-only for PUT's AI/building-survey
 *     pipeline; no `property_type` column on `jobs`.
 *   - `analyzeWithAI`, `runBuildingSurvey` — PUT-only switches.
 *
 * PUT remains the heavyweight entry point for AI analysis,
 * building-survey, and geocoding side effects.
 */
export const PATCH = withApiHandler({ roles: ['homeowner'] }, handlePatch);

/**
 * DELETE /api/jobs/[id] - Delete a posted job (homeowner only).
 * WBE-P1-1: previously bypassed withApiHandler with manual auth + CSRF.
 */
export const DELETE = withApiHandler({ roles: ['homeowner'] }, handleDelete);
