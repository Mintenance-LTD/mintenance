import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { requireCSRF } from '@/lib/csrf';

const rejectEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const validation = await validateRequest(request, rejectEscrowSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, reason } = validation.data;

    await AdminEscrowHoldService.rejectEscrowRelease(escrowId, user.id, reason);

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error rejecting escrow', error, { service: 'admin-escrow-reject' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject escrow' },
      { status: 500 }
    );
  }
}

