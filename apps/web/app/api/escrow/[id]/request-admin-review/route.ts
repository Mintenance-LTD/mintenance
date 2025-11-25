import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * POST /api/escrow/:id/request-admin-review
 * Contractor requests admin review after 7 days
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = id;

    // Verify user is contractor for this escrow
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        auto_approval_date,
        homeowner_approval,
        jobs!inner (
          id,
          contractor_id
        )
      `
      )
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    const job = (escrow as any).jobs;
    if (job.contractor_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if 7 days have passed since auto-approval date
    const autoApprovalDate = escrow.auto_approval_date ? new Date(escrow.auto_approval_date) : null;
    if (!autoApprovalDate) {
      return NextResponse.json({ error: 'Auto-approval date not set' }, { status: 400 });
    }

    const daysSinceAutoApproval = (Date.now() - autoApprovalDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAutoApproval < 7) {
      return NextResponse.json({
        error: `Cannot request admin review yet. ${Math.ceil(7 - daysSinceAutoApproval)} days remaining.`,
      }, { status: 400 });
    }

    // Check if homeowner has not approved
    if (escrow.homeowner_approval) {
      return NextResponse.json({ error: 'Homeowner has already approved' }, { status: 400 });
    }

    // Set escrow to pending admin review
    await AdminEscrowHoldService.holdEscrowForReview(
      escrowId,
      'system', // System-initiated hold
      'Contractor requested admin review after 7 days without homeowner response'
    );

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error requesting admin review', error, { service: 'escrow-request-admin-review' });
    return NextResponse.json({ error: 'Failed to request admin review' }, { status: 500 });
  }
}

