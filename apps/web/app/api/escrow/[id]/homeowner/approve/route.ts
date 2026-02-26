import { NextResponse } from 'next/server';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const approveCompletionSchema = z.object({
  comments: z.string().optional(),
});

/**
 * POST /api/escrow/:id/homeowner/approve - homeowner approves completion.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const escrowId = params.id;

    // Verify ownership BEFORE approval
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('jobs!inner(homeowner_id)')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      logger.warn('Escrow not found for approval', {
        service: 'homeowner-approve',
        userId: user.id,
        escrowId,
        error: escrowError?.message,
      });
      throw new NotFoundError('Escrow not found');
    }

    const jobs = escrow.jobs as unknown as { homeowner_id: string } | { homeowner_id: string }[];
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    if (job.homeowner_id !== user.id) {
      logger.warn('Unauthorized escrow approval attempt', {
        service: 'homeowner-approve',
        userId: user.id,
        escrowId,
        actualHomeowner: job.homeowner_id,
      });
      throw new ForbiddenError('You do not own this escrow transaction');
    }

    const validation = await validateRequest(request, approveCompletionSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { comments } = validation.data;

    await HomeownerApprovalService.approveCompletion(escrowId, user.id, comments);

    return NextResponse.json({ success: true, escrowId });
  },
);
