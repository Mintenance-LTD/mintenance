import { NextRequest, NextResponse } from 'next/server';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const approveEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/escrow/approve — approve release of a held escrow.
 *
 * Sprint 7 (3.1 adoption): step-up MFA required within 15 minutes. See
 * matching comment on /api/admin/escrow/hold — same rationale. Approving
 * a held escrow moves real money to a contractor; a stale admin session
 * must not be enough.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    requireMfaVerifiedWithinMinutes: 15,
  },
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
