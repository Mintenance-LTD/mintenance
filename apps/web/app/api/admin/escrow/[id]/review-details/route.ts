import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

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

