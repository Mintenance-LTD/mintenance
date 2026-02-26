import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

const releaseFeeTransferSchema = z.object({
  feeTransferId: z.string().uuid('Invalid fee transfer ID'),
});

/**
 * POST /api/admin/escrow/fee-transfer/release
 * Admin endpoint to release a held fee transfer
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, releaseFeeTransferSchema);
    if ('headers' in validation) return validation;

    const { feeTransferId } = validation.data;
    await FeeTransferService.releaseFeeTransfer(feeTransferId, user.id);

    logger.info('Fee transfer released by admin', {
      service: 'admin',
      adminId: user.id,
      feeTransferId,
    });

    return NextResponse.json({ success: true, message: 'Fee transfer released successfully' });
  }
);
