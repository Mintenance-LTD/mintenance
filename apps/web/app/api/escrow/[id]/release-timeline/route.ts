import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { logger } from '@mintenance/shared';

/**
 * GET /api/escrow/:id/release-timeline
 * Get release timeline and blockers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = params.id;
    const blockingReasons = await EscrowStatusService.getBlockingReasons(escrowId);
    const estimatedReleaseDate = await EscrowStatusService.getEstimatedReleaseDate(escrowId);

    return NextResponse.json({
      success: true,
      data: {
        blockingReasons,
        estimatedReleaseDate: estimatedReleaseDate?.toISOString() || null,
      },
    });
  } catch (error) {
    logger.error('Error getting release timeline', error, { service: 'escrow-release-timeline' });
    return NextResponse.json({ error: 'Failed to get timeline' }, { status: 500 });
  }
}

