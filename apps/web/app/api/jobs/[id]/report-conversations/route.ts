import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError, BadRequestError } from '@/lib/errors/api-error';
export const GET = withApiHandler({}, async (request, { user, params }) => {
  const offset = Number(request.nextUrl.searchParams.get('offset') || 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    throw new BadRequestError('Invalid page');
  const { data: job, error: lookup } = await serverSupabase
    .from('jobs')
    .select('homeowner_id,contractor_id')
    .eq('id', params.id)
    .maybeSingle();
  if (lookup) throw lookup;
  if (!job || ![job.homeowner_id, job.contractor_id].includes(user.id))
    throw new ForbiddenError('Job unavailable');
  const { data, error } = await serverSupabase
    .from('anonymous_reports')
    .select('id,category,status')
    .eq('job_id', params.id)
    .order('id')
    .range(offset, offset + 25);
  if (error) throw error;
  return NextResponse.json(
    { reports: (data || []).slice(0, 25), hasMore: (data || []).length > 25 },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
});
