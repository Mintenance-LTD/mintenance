import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

const holdFeeTransferSchema = z
  .object({
    feeTransferId: z.string().uuid('Invalid fee transfer ID'),
    reason: z.string().min(1, 'Reason is required'),
  })
  .strict();

/**
 * POST /api/admin/escrow/fee-transfer/hold
 * Admin endpoint to hold a fee transfer. Moves platform-fee funds into
 * a hold state — requires fresh MFA step-up (15-minute window), matching
 * the release / approve / refund policy.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'escrow_fee_transfer_hold',
      category: 'revenue',
      targetType: 'escrow',
      description: 'Held an escrow fee transfer',
    },
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, holdFeeTransferSchema);
    if ('headers' in validation) return validation;

    const { feeTransferId, reason } = validation.data;
    await FeeTransferService.holdFeeTransfer(feeTransferId, user.id, reason);

    logger.info('Fee transfer held by admin', {
      service: 'admin',
      adminId: user.id,
      feeTransferId,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Fee transfer held successfully',
    });
  }
);
