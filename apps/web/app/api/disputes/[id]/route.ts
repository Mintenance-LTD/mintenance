import { readRetainedDispute } from '@/lib/services/disputes/retained';
import { readDisputeEvidence } from '@/lib/services/disputes/evidence';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
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

    const escrowQuery = serverSupabase
      .from('escrow_transactions')
      .select(
        'id, job_id, payer_id, payee_id, amount, status, dispute_priority, sla_deadline, escalation_level, mediation_requested_at, mediation_status, mediation_outcome, created_at, updated_at'
      )
      .eq('id', disputeId);

    const { data: escrow, error: escrowError } =
      await escrowQuery.maybeSingle();

    if (escrowError)
      throw new InternalServerError(
        'Unable to load the dispute. Please retry.'
      );
    if (!escrow) {
      const retained = await readRetainedDispute(disputeId, user.id);
      if (retained) return NextResponse.json(retained);
      // Return generic error to avoid leaking dispute existence
      throw new NotFoundError('Dispute not found or access denied');
    }

    // A homeowner can remain the claimant when payment is delegated. Verify
    // the current job/escrow relationship before allowing that additional reader.
    if (
      !isAdmin &&
      escrow.payer_id !== user.id &&
      escrow.payee_id !== user.id
    ) {
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('homeowner_id, payer_user_id, contractor_id')
        .eq('id', escrow.job_id)
        .maybeSingle();
      if (jobError)
        throw new InternalServerError(
          'Unable to check dispute access. Please retry.'
        );
      if (
        !job ||
        job.homeowner_id !== user.id ||
        job.contractor_id !== escrow.payee_id ||
        (job.payer_user_id ?? job.homeowner_id) !== escrow.payer_id
      ) {
        throw new ForbiddenError('Not authorized to view this dispute');
      }
    }

    // Match the exact payment. Legacy unbound disputes need reconciliation;
    // choosing the most recent job dispute can expose another payer's record.
    let disputeRecord: {
      id: string;
      reason: string;
      description: string | null;
      resolution: string | null;
      resolved_at: string | null;
      status: string | null;
      raised_by: string | null;
      against: string | null;
      created_at: string | null;
    } | null = null;

    if (escrow.job_id) {
      const { data: drows, error: recordError } = await serverSupabase
        .from('disputes')
        .select(
          'id, reason, description, resolution, resolved_at, status, raised_by, against, created_at, dispute_escrow_links!inner(escrow_id)'
        )
        .eq('job_id', escrow.job_id)
        .eq('dispute_escrow_links.escrow_id', escrow.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recordError)
        throw new InternalServerError(
          'Unable to load dispute details. Please retry.'
        );
      if (drows && drows.length > 0) {
        disputeRecord = drows[0];
      }
    }

    if (!disputeRecord) {
      const retained = await readRetainedDispute(disputeId, user.id);
      if (retained) return NextResponse.json(retained);
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
      created_at: disputeRecord?.created_at ?? null,
      updated_at: escrow.updated_at,
      // Frontend-facing aliases (apps/web/app/disputes/[id]/page.tsx)
      dispute_reason: disputeRecord?.reason ?? null,
      description: disputeRecord?.description ?? null,
      dispute_evidence: await readDisputeEvidence(
        disputeRecord?.description ?? null,
        escrow.job_id,
        disputeRecord?.raised_by ?? null
      ),
      resolution: disputeRecord?.resolution ?? null,
      resolved_at: disputeRecord?.resolved_at ?? null,
      dispute_record_id: disputeRecord?.id ?? null,
      dispute_record_status: disputeRecord?.status ?? null,
      raised_by: disputeRecord?.raised_by ?? null,
      against: disputeRecord?.against ?? null,
    });
  }
);
