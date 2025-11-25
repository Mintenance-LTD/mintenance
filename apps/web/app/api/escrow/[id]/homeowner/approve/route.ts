import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { requireCSRF } from '@/lib/csrf';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = id;

    const validation = await validateRequest(request, approveCompletionSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { comments } = validation.data;

    await HomeownerApprovalService.approveCompletion(escrowId, user.id, comments);

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error approving completion', error, { service: 'homeowner-approve' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve completion' },
      { status: 500 }
    );
  }
}

