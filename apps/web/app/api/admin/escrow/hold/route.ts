import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const holdEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      logger.warn('Unauthorized attempt to hold escrow', { userId: user?.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const validation = await validateRequest(request, holdEscrowSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, reason } = validation.data;

    await AdminEscrowHoldService.holdEscrowForReview(escrowId, user.id, reason);

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error holding escrow', error, { service: 'admin-escrow-hold' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to hold escrow' },
      { status: 500 }
    );
  }
}

