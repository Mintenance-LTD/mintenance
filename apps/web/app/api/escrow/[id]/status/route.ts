import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { logger } from '@mintenance/shared';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await EscrowStatusService.getCurrentStatus(escrowId);

    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    logger.error('Error getting escrow status', error, { service: 'escrow-status' });
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

