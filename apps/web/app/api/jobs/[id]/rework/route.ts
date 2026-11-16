import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { getJobReworkRequests } from '@/lib/jobs/rework-evidence';

export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user, params }) => {
    const { data: job, error } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, payer_user_id, contractor_id')
      .eq('id', params.id)
      .single();
    if (error || !job) throw new NotFoundError('Job not found');
    if (
      ![job.homeowner_id, job.payer_user_id, job.contractor_id].includes(
        user.id
      ) &&
      user.role !== 'admin'
    ) {
      throw new ForbiddenError('You cannot access this job’s rework history');
    }
    return NextResponse.json({
      requests: await getJobReworkRequests(params.id),
    });
  }
);
