import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

const batchTransferSchema = z.object({
  feeTransferIds: z.array(z.string().uuid('Invalid fee transfer ID')).min(1),
});

/**
 * POST /api/admin/escrow/fee-transfer/batch
 * Admin endpoint to batch transfer multiple fees
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, batchTransferSchema);
    if ('headers' in validation) return validation;

    const { feeTransferIds } = validation.data;
    const result = await FeeTransferService.batchTransferFees(feeTransferIds, user.id);

    logger.info('Batch fee transfer completed', {
      service: 'admin',
      adminId: user.id,
      success: result.success,
      failed: result.failed,
      total: feeTransferIds.length,
    });

    return NextResponse.json({
      success: true,
      message: `Batch transfer completed: ${result.success} succeeded, ${result.failed} failed`,
      result,
    });
  }
);
