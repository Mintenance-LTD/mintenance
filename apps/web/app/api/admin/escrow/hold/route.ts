import { NextRequest, NextResponse } from 'next/server';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const holdEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, holdEscrowSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, reason } = validation.data;

    await AdminEscrowHoldService.holdEscrowForReview(escrowId, user.id, reason);

    return NextResponse.json({ success: true, escrowId });
  }
);
