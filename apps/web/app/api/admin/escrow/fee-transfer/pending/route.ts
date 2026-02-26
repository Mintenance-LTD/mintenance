import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';

/**
 * GET /api/admin/escrow/fee-transfer/pending
 * Admin endpoint to get pending fee transfers
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100', 10);
    const pendingTransfers = await FeeTransferService.getPendingFeeTransfers(limit);

    return NextResponse.json({
      success: true,
      transfers: pendingTransfers,
      count: pendingTransfers.length,
    });
  }
);
