import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';
import { handleAPIError } from '@/lib/errors/api-error';

const holdFeeTransferSchema = z.object({
  feeTransferId: z.string().uuid('Invalid fee transfer ID'),
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * POST /api/admin/escrow/fee-transfer/hold
 * Admin endpoint to hold a fee transfer
 */
export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const validation = await validateRequest(request, holdFeeTransferSchema);
    if ('headers' in validation) {
      return validation;
    }

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
  } catch (error) {
    return handleAPIError(error);
  }
}

