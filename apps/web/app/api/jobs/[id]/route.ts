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
 * PATCH /api/jobs/[id] - Partial update (homeowner only).
 *
 * WBE-P1-1: previously bypassed withApiHandler with manual auth + CSRF.
 *
 * Audit re-review (2026-04-29): PATCH now writes every column the
 * shared `updateJobSchema` declares — title, description, status,
 * category, budget, urgency, location, city, postcode, access_info,
 * requirements, budget_min, budget_max, start_date, end_date,
 * flexible_timeline, plus a job_attachments rebuild for
 * photoUrls/images. The only PUT-exclusive concerns left are AI
 * analysis (`analyzeWithAI`) + geocoding side effects, which own
 * their own caching/rate-limit pipelines and don't fit a
 * lightweight partial-update semantic.
 */
export const PATCH = withApiHandler({ roles: ['homeowner'] }, handlePatch);

/**
 * DELETE /api/jobs/[id] - Delete a posted job (homeowner only).
 * WBE-P1-1: previously bypassed withApiHandler with manual auth + CSRF.
 */
export const DELETE = withApiHandler({ roles: ['homeowner'] }, handleDelete);
