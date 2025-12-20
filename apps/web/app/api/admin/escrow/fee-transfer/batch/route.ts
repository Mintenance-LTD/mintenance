import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

const batchTransferSchema = z.object({
  feeTransferIds: z.array(z.string().uuid('Invalid fee transfer ID')).min(1),
});

/**
 * POST /api/admin/escrow/fee-transfer/batch
 * Admin endpoint to batch transfer multiple fees
 */
export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await validateRequest(request, batchTransferSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { feeTransferIds } = validation.data;

    const result = await FeeTransferService.batchTransferFees(
      feeTransferIds,
      user.id
    );

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
  } catch (error) {
    logger.error('Error batch transferring fees', error, { service: 'admin' });
    return NextResponse.json(
      { error: 'Failed to batch transfer fees' },
      { status: 500 }
    );
  }
}

