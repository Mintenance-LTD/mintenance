import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  DisputeWorkflowService,
  type DisputePriority,
} from '@/lib/services/disputes/DisputeWorkflowService';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';
import {
  getDeterministicIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
} from '@/lib/idempotency';

const createDisputeSchema = z.object({
  escrowId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required')
    .max(200, 'Reason is too long'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(10_000, 'Description is too long'),
  // Clients send filenames and storage references, not necessarily URLs.
  evidence: z
    .array(z.string().trim().min(1).max(2_048))
    .max(20, 'Too many evidence items')
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

/**
 * POST /api/disputes/create
 * Create a new dispute for an escrow transaction.
 *
 * 2026-05-09: corrected to match the live schema. `escrow_transactions`
 * has `payer_id`/`payee_id` (NOT `contractor_id`/`client_id`) and has
 * no `dispute_reason`/`dispute_evidence` columns — those live in the
 * `disputes` table as `reason`/`description`.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, createDisputeSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, reason, description, evidence, priority } =
      validation.data;

    const idempotencyKey = getDeterministicIdempotencyKeyFromRequest(
      request,
      'create_dispute',
      user.id,
      escrowId
    );
    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'create_dispute'
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    return await releaseOnError(
      idempotencyKey,
      'create_dispute',
      async () => {

      // Look up escrow with the columns that actually exist
      const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, payer_id, payee_id, status, job_id')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow not found');
    }

    if (escrow.payer_id !== user.id && escrow.payee_id !== user.id) {
      throw new ForbiddenError(
        'Not authorized to create dispute for this escrow'
      );
    }

    const against =
      escrow.payer_id === user.id ? escrow.payee_id : escrow.payer_id;

    // Persist canonical dispute record. The `disputes` table has no
    // dedicated evidence column, so we append a numbered evidence list
    // to `description` to avoid silently dropping client-provided URLs.
    const evidenceSummary =
      evidence && evidence.length > 0
        ? `\n\nEvidence:\n${evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
        : '';

    // Atomically lock the escrow, validate the participants again, update
    // its state, and insert the dispute record. This prevents an escrow from
    // being left `disputed` without a canonical dispute row if an insert or
    // concurrent state change fails.
    const { data: disputeRows, error: disputeInsertError } =
      await serverSupabase.rpc('create_dispute_atomic', {
        p_escrow_id: escrowId,
        p_raised_by: user.id,
        p_against: against,
        p_reason: reason,
        p_description: `${description}${evidenceSummary}`,
      });
    const disputeRow = Array.isArray(disputeRows)
      ? disputeRows[0]
      : disputeRows;

    if (disputeInsertError || !disputeRow) {
      logger.error('Failed to insert dispute record', {
        service: 'disputes',
        escrowId,
        error: disputeInsertError?.message,
      });
      throw new InternalServerError('Failed to create dispute');
    }

    // Set priority and SLA on the escrow row (writes dispute_priority/sla_deadline)
    await DisputeWorkflowService.setDisputePriority(
      escrowId,
      priority as DisputePriority
    );

    // Attempt auto-resolution (runs asynchronously)
    DisputeWorkflowService.attemptAutoResolution(escrowId).catch((error) => {
      logger.error('Error in auto-resolution attempt', error, {
        service: 'disputes',
        escrowId,
      });
    });

      const responseData = {
        message: 'Dispute created successfully',
        disputeId: escrowId,
        disputeRecordId: disputeRow.dispute_id,
      };

      await storeIdempotencyResult(
        idempotencyKey,
        'create_dispute',
        responseData,
        user.id,
        { escrowId, disputeRecordId: disputeRow.dispute_id }
      );

      return NextResponse.json(responseData);
      }
    );
  }
);
