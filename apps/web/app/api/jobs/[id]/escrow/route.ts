import { NextResponse } from 'next/server';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { csrf: false },
  async (request, { user, params }) => {
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const jobId = params.id;

    const { data: job, error: jobError } = await userDb
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Allow homeowner, assigned contractor, or admin
    if (job.homeowner_id !== user.id && job.contractor_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to access escrow details for this job');
    }

    const { data: escrow, error: escrowError } = await userDb
      .from('escrow_transactions')
      .select('id, job_id, status, amount, payment_intent_id, created_at, updated_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Return null escrow instead of 404 — job may not have escrow yet
    if (escrowError || !escrow) {
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
