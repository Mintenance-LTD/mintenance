import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { requireCSRF } from '@/lib/csrf';

const rejectCompletionSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/**
 * POST /api/escrow/:id/homeowner/reject
 * Homeowner rejects completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = params.id;

    const validation = await validateRequest(request, rejectCompletionSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { reason } = validation.data;

    await HomeownerApprovalService.rejectCompletion(escrowId, user.id, reason);

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error rejecting completion', error, { service: 'homeowner-reject' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject completion' },
      { status: 500 }
    );
  }
}

