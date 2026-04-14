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
 * WBE-P1-1: previously bypassed withApiHandler with manual auth + CSRF.
 */
export const PATCH = withApiHandler({ roles: ['homeowner'] }, handlePatch);

/**
 * DELETE /api/jobs/[id] - Delete a posted job (homeowner only).
 * WBE-P1-1: previously bypassed withApiHandler with manual auth + CSRF.
 */
export const DELETE = withApiHandler({ roles: ['homeowner'] }, handleDelete);
