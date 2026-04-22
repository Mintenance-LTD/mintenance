import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const rejectEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/**
 * POST /api/admin/escrow/reject
 * Admin endpoint to reject an escrow release. The inverse of approve,
 * and just as sensitive — locks up contractor funds. Requires fresh MFA
 * step-up (15-minute window), matching /api/admin/escrow/approve.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, rejectEscrowSchema);
    if ('headers' in validation) return validation;

    const { escrowId, reason } = validation.data;
    await AdminEscrowHoldService.rejectEscrowRelease(escrowId, user.id, reason);

    return NextResponse.json({ success: true, escrowId });
  }
);
