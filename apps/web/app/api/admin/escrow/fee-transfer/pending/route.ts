import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { logger } from '@mintenance/shared';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

/**
 * GET /api/admin/escrow/fee-transfer/pending
 * Admin endpoint to get pending fee transfers
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

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

