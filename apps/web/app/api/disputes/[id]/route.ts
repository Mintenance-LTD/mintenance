import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/disputes/[id]
 * Fetch a dispute view for the homeowner/contractor (or admin).
 *
 * The :id parameter is the `escrow_transactions.id` (matches the
 * contract returned by POST /api/disputes/create). The escrow row holds
 * the workflow state (priority, SLA, mediation), and the canonical
 * `disputes` table holds the user-supplied reason/description and the
 * resolution outcome. We return a flat shape to the frontend.
 *
 * 2026-05-09: prior version queried non-existent columns
 * (`contractor_id`/`client_id`/`reason`/`description`/`resolution`)
 * directly on `escrow_transactions` and 404'd every call.
 */
export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user, params }) => {
    const { id: disputeId } = params;

    if (!isValidUUID(disputeId)) {
      throw new BadRequestError('Invalid dispute ID format');
    }

    const isAdmin = user.role === 'admin';

    let escrowQuery = serverSupabase
      .from('escrow_transactions')
      .select(
        'id, job_id, payer_id, payee_id, amount, status, dispute_priority, sla_deadline, escalation_level, mediation_requested_at, mediation_status, mediation_outcome, created_at, updated_at'
      )
      .eq('id', disputeId);

    if (!isAdmin) {
      escrowQuery = escrowQuery.or(
        `payer_id.eq.${user.id},payee_id.eq.${user.id}`
      );
    }

    const { data: escrow, error: escrowError } =
      await escrowQuery.maybeSingle();

    if (escrowError || !escrow) {
      // Return generic error to avoid leaking dispute existence
      throw new NotFoundError('Dispute not found or access denied');
    }

    // Belt-and-braces ownership check
    if (
      !isAdmin &&
      escrow.payer_id !== user.id &&
      escrow.payee_id !== user.id
    ) {
      throw new ForbiddenError('Not authorized to view this dispute');
    }

    // Most-recent dispute record on the same job
    let disputeRecord: {
      id: string;
      reason: string;
      description: string | null;
      resolution: string | null;
      resolved_at: string | null;
      status: string | null;
      raised_by: string | null;
      against: string | null;
    } | null = null;

    if (escrow.job_id) {
      const { data: drows } = await serverSupabase
        .from('disputes')
        .select(
          'id, reason, description, resolution, resolved_at, status, raised_by, against'
        )
        .eq('job_id', escrow.job_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (drows && drows.length > 0) {
        disputeRecord = drows[0];
      }
    }

    return NextResponse.json({
      id: escrow.id,
      job_id: escrow.job_id,
      payer_id: escrow.payer_id,
      payee_id: escrow.payee_id,
      amount: escrow.amount,
      status: escrow.status,
      priority: escrow.dispute_priority,
      sla_deadline: escrow.sla_deadline,
      escalation_level: escrow.escalation_level,
      mediation_requested_at: escrow.mediation_requested_at,
      mediation_status: escrow.mediation_status,
      mediation_outcome: escrow.mediation_outcome,
      created_at: escrow.created_at,
      updated_at: escrow.updated_at,
      // Frontend-facing aliases (apps/web/app/disputes/[id]/page.tsx)
      dispute_reason: disputeRecord?.reason ?? null,
      description: disputeRecord?.description ?? null,
      dispute_evidence: [] as unknown[],
      resolution: disputeRecord?.resolution ?? null,
      resolved_at: disputeRecord?.resolved_at ?? null,
      dispute_record_id: disputeRecord?.id ?? null,
      dispute_record_status: disputeRecord?.status ?? null,
      raised_by: disputeRecord?.raised_by ?? null,
      against: disputeRecord?.against ?? null,
    });
  }
);
