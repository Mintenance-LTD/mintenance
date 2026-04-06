import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { handleGet } from './_handlers/get';
import { handlePut } from './_handlers/put';
import { handlePatch } from './_handlers/patch';
import { handleDelete } from './_handlers/delete';
import type { Params } from './_handlers/shared';

export const GET = withApiHandler({ csrf: false }, handleGet);

/**
 * PUT /api/jobs/[id] - Update job with comprehensive AI analysis
 */
export const PUT = withApiHandler({ roles: ['homeowner'] }, handlePut);

export async function PATCH(request: NextRequest, context: Params) {
  return handlePatch(request, context);
}

export async function DELETE(request: NextRequest, context: Params) {
  return handleDelete(request, context);
}
