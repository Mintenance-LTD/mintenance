import { NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { csrf: false },
  async (request, { user, params }) => {
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const jobId = params.id;

    const { data: job, error: jobError } = await userDb
      .from('jobs')
      .select('id, homeowner_id, payer_user_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Allow homeowner, assigned contractor, or admin
    if (
      job.homeowner_id !== user.id &&
      job.payer_user_id !== user.id &&
      job.contractor_id !== user.id &&
      user.role !== 'admin'
    ) {
      throw new ForbiddenError(
        'You do not have permission to access escrow details for this job'
      );
    }

    const { data: escrow, error: escrowError } = await userDb
      .from('escrow_transactions')
      .select(
        'id, job_id, status, amount, payment_intent_id, created_at, updated_at'
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (escrowError) {
      throw new InternalServerError(
        'Unable to load payment details. Please retry.'
      );
    }
    // A successful empty lookup means the job has no escrow yet.
    if (!escrow) {
      return NextResponse.json({ escrow: null });
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
