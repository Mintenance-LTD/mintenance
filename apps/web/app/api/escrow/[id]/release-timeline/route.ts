import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';

/**
 * GET /api/escrow/:id/release-timeline
 * Get release timeline and blockers
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const blockingReasons = await EscrowStatusService.getBlockingReasons(params.id);
    const estimatedReleaseDate = await EscrowStatusService.getEstimatedReleaseDate(params.id);

    return NextResponse.json({
      success: true,
      data: {
        blockingReasons,
        estimatedReleaseDate: estimatedReleaseDate?.toISOString() || null,
      },
    });
  }
);
