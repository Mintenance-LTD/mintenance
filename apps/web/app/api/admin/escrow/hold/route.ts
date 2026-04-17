import { NextRequest, NextResponse } from 'next/server';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const holdEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/**
 * POST /api/admin/escrow/hold — place an escrow on admin review hold.
 *
 * Sprint 7 (3.1 adoption): opted into the step-up MFA gate. An admin must
 * have re-verified MFA within the last 15 minutes via /api/auth/mfa/step-up
 * before this mutation succeeds. A long-lived admin session alone is not
 * enough — a stolen laptop / open session cannot move escrow state.
 * Clients handle the 403 {requiresStepUp:true} response by prompting for
 * a fresh TOTP code then retrying.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    requireMfaVerifiedWithinMinutes: 15,
  },
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
