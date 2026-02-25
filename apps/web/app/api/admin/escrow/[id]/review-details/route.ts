import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { BadRequestError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/escrow/[id]/review-details
 * Get detailed review information for a specific escrow
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (_request, { params }) => {
    const escrowId = params.id;
    if (!escrowId) {
      throw new BadRequestError('Escrow ID is required');
    }

    const reviewDetails = await AdminEscrowHoldService.getEscrowReviewDetails(escrowId);
    return NextResponse.json({ success: true, data: reviewDetails });
  }
);
