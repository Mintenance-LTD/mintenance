import { NextRequest, NextResponse } from 'next/server';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const rejectCompletionSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/**
 * POST /api/escrow/:id/homeowner/reject
 * Homeowner rejects completion
 */
export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const escrowId = params.id;

    const validation = await validateRequest(request, rejectCompletionSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { reason } = validation.data;

    await HomeownerApprovalService.rejectCompletion(escrowId, user.id, reason);

    return NextResponse.json({ success: true, escrowId });
  }
);
