import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';

/**
 * GET /api/escrow/:id/status
 * Get real-time escrow status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: escrowId } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view escrow status');
    }

    const status = await EscrowStatusService.getCurrentStatus(escrowId);

    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    return handleAPIError(error);
  }
}

