import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { requireCSRF } from '@/lib/csrf';

const approveEscrowSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

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

