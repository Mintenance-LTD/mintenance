import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError } from '@/lib/errors/api-error';
import { readPropertyRepair } from '@/lib/services/property-team/read-property-repair';

export const GET = withApiHandler({}, async (_request, { user, params }) => {
  const repair = await readPropertyRepair(user.id, params.id, params.jobId);
  if (!repair) throw new NotFoundError('Repair not found for this property');
  return NextResponse.json(repair, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
