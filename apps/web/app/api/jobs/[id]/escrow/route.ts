import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user, params }) => {
    const jobId = params.id;

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id && job.contractor_id !== user.id) {
      throw new ForbiddenError('You do not have permission to access escrow details for this job');
    }

    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, status, amount, payment_intent_id, created_at, updated_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow transaction not found for this job');
    }

    return NextResponse.json({
      escrow: {
        id: escrow.id,
        jobId: escrow.job_id,
        status: escrow.status,
        amount: escrow.amount,
        paymentIntentId: escrow.payment_intent_id,
        createdAt: escrow.created_at,
        updatedAt: escrow.updated_at,
      },
    });
  }
);
