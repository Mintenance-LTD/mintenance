import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';

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
      throw new BadRequestError('Escrow ID is required');
    }

    const reviewDetails = await AdminEscrowHoldService.getEscrowReviewDetails(escrowId);

    return NextResponse.json({ success: true, data: reviewDetails });
  } catch (error) {
    return handleAPIError(error);
  }
}

