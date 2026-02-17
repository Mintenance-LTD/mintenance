import { NextRequest, NextResponse } from 'next/server';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const approveEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  notes: z.string().optional(),
});

export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, approveEscrowSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, notes } = validation.data;

    await AdminEscrowHoldService.approveEscrowRelease(escrowId, user.id, notes);

    return NextResponse.json({ success: true, escrowId });
  }
);
