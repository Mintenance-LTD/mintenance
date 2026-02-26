import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

/** Type for escrow with job relation (Supabase !inner join returns jobs as array) */
interface EscrowHomeownerJob {
  id: string;
  homeowner_id: string;
}

interface EscrowWithHomeownerJob {
  id: string;
  jobs: EscrowHomeownerJob | EscrowHomeownerJob[];
}

/**
 * POST /api/escrow/:id/homeowner/inspect
 * Mark inspection completed
 */
export const POST = withApiHandler({ rateLimit: { maxRequests: 20 } }, async (_request, { user, params }) => {
  const { id: escrowId } = params as { id: string };

  const { data: escrow, error: escrowError } = await serverSupabase
    .from('escrow_transactions')
    .select(`
      id,
      jobs!inner (
        id,
        homeowner_id
      )
    `)
    .eq('id', escrowId)
    .single();

  if (escrowError || !escrow) {
    throw new NotFoundError('Escrow not found');
  }

  const typedEscrow = escrow as unknown as EscrowWithHomeownerJob;
  const job = Array.isArray(typedEscrow.jobs) ? typedEscrow.jobs[0] : typedEscrow.jobs;
  if (job.homeowner_id !== user.id) {
    throw new ForbiddenError('Unauthorized');
  }

  await serverSupabase
    .from('escrow_transactions')
    .update({
      homeowner_inspection_completed: true,
      homeowner_inspection_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);

  return NextResponse.json({ success: true, escrowId });
});
