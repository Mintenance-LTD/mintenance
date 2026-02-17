import { NextRequest, NextResponse } from 'next/server';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/escrow/:id/status
 * Get real-time escrow status
 */
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor', 'admin'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const escrowId = params.id;

    const status = await EscrowStatusService.getCurrentStatus(escrowId);

    return NextResponse.json({ success: true, data: status });
  }
);
