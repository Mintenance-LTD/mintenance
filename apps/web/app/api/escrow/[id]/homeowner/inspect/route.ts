import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * POST /api/escrow/:id/homeowner/inspect
 * Mark inspection completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = params.id;

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
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    const job = (escrow as any).jobs;
    if (job.homeowner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    return NextResponse.json({ error: 'Failed to mark inspection' }, { status: 500 });
  }
}

