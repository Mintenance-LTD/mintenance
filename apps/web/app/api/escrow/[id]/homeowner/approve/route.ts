import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { requireCSRF } from '@/lib/csrf';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

const approveCompletionSchema = z.object({
  comments: z.string().optional(),
});

/**
 * POST /api/escrow/:id/homeowner/approve
 * Homeowner approves completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to approve escrow');
    }

    const escrowId = id;

    // SECURITY FIX: Verify ownership BEFORE approval
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

    // Verify the requesting user is the homeowner
    if (escrow.jobs.homeowner_id !== user.id) {
      logger.warn('Unauthorized escrow approval attempt', {
        service: 'homeowner-approve',
        userId: user.id,
        escrowId,
        actualHomeowner: escrow.jobs.homeowner_id,
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
  } catch (error) {
    return handleAPIError(error);
  }
}

