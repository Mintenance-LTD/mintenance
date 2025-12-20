import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      logger.warn('Unauthorized attempt to fetch review details', { userId: user?.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: escrowId } = await params;

    if (!escrowId) {
      return NextResponse.json({ error: 'Escrow ID is required' }, { status: 400 });
    }

    const reviewDetails = await AdminEscrowHoldService.getEscrowReviewDetails(escrowId);

    return NextResponse.json({ success: true, data: reviewDetails });
  } catch (error) {
    logger.error('Error fetching review details', error, { service: 'admin-escrow-review-details' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch review details' },
      { status: 500 }
    );
  }
}

