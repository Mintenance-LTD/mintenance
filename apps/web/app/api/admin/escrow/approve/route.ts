import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const approveEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      logger.warn('Unauthorized attempt to approve escrow', { userId: user?.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const validation = await validateRequest(request, approveEscrowSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, notes } = validation.data;

    await AdminEscrowHoldService.approveEscrowRelease(escrowId, user.id, notes);

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error approving escrow', error, { service: 'admin-escrow-approve' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve escrow' },
      { status: 500 }
    );
  }
}

