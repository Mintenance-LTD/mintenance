import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';

/**
 * GET /api/admin/escrow/pending-reviews
 * Admin endpoint to get pending escrow reviews
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const reviews = await AdminEscrowHoldService.getPendingAdminReviews(limit);
    return NextResponse.json({ success: true, data: reviews });
  }
);
