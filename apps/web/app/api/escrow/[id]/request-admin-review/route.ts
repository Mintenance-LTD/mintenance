import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';

/** Type for escrow with job relation (Supabase !inner join returns jobs as array) */
interface EscrowContractorJob {
  id: string;
  contractor_id: string;
}

interface EscrowWithContractorJob {
  id: string;
  auto_approval_date: string | null;
  homeowner_approval: string | null;
  jobs: EscrowContractorJob | EscrowContractorJob[];
}

/**
 * POST /api/escrow/:id/request-admin-review
 * Contractor requests admin review after 7 days
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const { id: escrowId } = params as { id: string };

    // Verify user is contractor for this escrow
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(`
        id,
        auto_approval_date,
        homeowner_approval,
        jobs!inner (
          id,
          contractor_id
        )
      `)
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow not found');
    }

    const typedEscrow = escrow as unknown as EscrowWithContractorJob;
    const job = Array.isArray(typedEscrow.jobs) ? typedEscrow.jobs[0] : typedEscrow.jobs;
    if (job.contractor_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Unauthorized');
    }

    // Check if 7 days have passed since auto-approval date
    const autoApprovalDate = escrow.auto_approval_date ? new Date(escrow.auto_approval_date) : null;
    if (!autoApprovalDate) {
      throw new BadRequestError('Auto-approval date not set');
    }

    const daysSinceAutoApproval = (Date.now() - autoApprovalDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAutoApproval < 7) {
      return NextResponse.json({
        error: `Cannot request admin review yet. ${Math.ceil(7 - daysSinceAutoApproval)} days remaining.`,
      }, { status: 400 });
    }

    // Check if homeowner has not approved
    if (escrow.homeowner_approval) {
      throw new BadRequestError('Homeowner has already approved');
    }

    // Set escrow to pending admin review
    await AdminEscrowHoldService.holdEscrowForReview(
      escrowId,
      'system',
      'Contractor requested admin review after 7 days without homeowner response'
    );

    return NextResponse.json({ success: true, escrowId });
  }
);
