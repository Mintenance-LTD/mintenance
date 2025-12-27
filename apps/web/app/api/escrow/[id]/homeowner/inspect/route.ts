import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

/**
 * POST /api/escrow/:id/homeowner/inspect
 * Mark inspection completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const escrowId = id;

    // Verify user is homeowner
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        jobs!inner (
          id,
          homeowner_id
        )
      `
      )
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow not found');
    }

    const job = (escrow as any).jobs;
    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Unauthorized');
    }

    // Update inspection status
    await serverSupabase
      .from('escrow_transactions')
      .update({
        homeowner_inspection_completed: true,
        homeowner_inspection_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowId);

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error marking inspection completed', error, { service: 'homeowner-inspect' });
    throw new InternalServerError('Failed to mark inspection');
  }
}

