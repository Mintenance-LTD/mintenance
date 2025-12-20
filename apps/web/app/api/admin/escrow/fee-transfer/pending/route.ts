import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

/**
 * GET /api/admin/escrow/fee-transfer/pending
 * Admin endpoint to get pending fee transfers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const pendingTransfers = await FeeTransferService.getPendingFeeTransfers(
      limit
    );

    return NextResponse.json({
      success: true,
      transfers: pendingTransfers,
      count: pendingTransfers.length,
    });
  } catch (error) {
    logger.error('Error getting pending fee transfers', error, {
      service: 'admin',
    });
    return NextResponse.json(
      { error: 'Failed to get pending fee transfers' },
      { status: 500 }
    );
  }
}

