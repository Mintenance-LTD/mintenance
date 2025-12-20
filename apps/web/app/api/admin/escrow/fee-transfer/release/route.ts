import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

const releaseFeeTransferSchema = z.object({
  feeTransferId: z.string().uuid('Invalid fee transfer ID'),
});

/**
 * POST /api/admin/escrow/fee-transfer/release
 * Admin endpoint to release a held fee transfer
 */
export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await validateRequest(request, releaseFeeTransferSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { feeTransferId } = validation.data;

    await FeeTransferService.releaseFeeTransfer(feeTransferId, user.id);

    logger.info('Fee transfer released by admin', {
      service: 'admin',
      adminId: user.id,
      feeTransferId,
    });

    return NextResponse.json({
      success: true,
      message: 'Fee transfer released successfully',
    });
  } catch (error) {
    logger.error('Error releasing fee transfer', error, { service: 'admin' });
    return NextResponse.json(
      { error: 'Failed to release fee transfer' },
      { status: 500 }
    );
  }
}

