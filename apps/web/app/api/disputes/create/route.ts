import { disputeEvidencePath } from '@/lib/services/disputes/evidence';
import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  BadRequestError,
  ForbiddenError,
  ConflictError,
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

    const durableEvidence = evidence?.map((value) => {
      const path = disputeEvidencePath(value, escrow.job_id, user.id);
      if (value.startsWith('job-attachments:') && !path) {
        throw new BadRequestError(
          'Evidence must belong to this job and your account'
        );
      }
      return path ? `job-attachments:${path}` : value;
    });

    const idempotencyKey = getDeterministicIdempotencyKeyFromRequest(
      request,
      'create_dispute',
      user.id,
      escrowId
    );
    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'create_dispute',
      true,
      { userId: user.id, request: validation.data }
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    return await releaseOnError(
      idempotencyKey,
      'create_dispute',
      async () => {
        const against =
          escrow.payer_id === user.id ? escrow.payee_id : escrow.payer_id;

        // Persist canonical dispute record. The `disputes` table has no
        // dedicated evidence column, so we append a numbered evidence list
        // to `description` to avoid silently dropping client-provided URLs.
        const evidenceSummary =
          durableEvidence && durableEvidence.length > 0
            ? `\n\nEvidence:\n${durableEvidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
            : '';

        // Atomically lock the escrow, validate the participants again, update
        // its state, and insert the dispute record. This prevents an escrow from
        // being left `disputed` without a canonical dispute row if an insert or
        // concurrent state change fails.
        const { data: disputeRows, error: disputeInsertError } =
          await serverSupabase.rpc('create_dispute_with_priority', {
            p_escrow_id: escrowId,
            p_raised_by: user.id,
            p_against: against,
            p_reason: reason,
            p_priority: priority,
            p_description: `${description}${evidenceSummary}`,
          });
        const disputeRow = Array.isArray(disputeRows)
          ? disputeRows[0]
          : disputeRows;

        if (disputeInsertError?.code === '42501')
          throw new ForbiddenError('Not authorized to dispute this escrow');
        if (disputeInsertError?.code === '23514')
          throw new ConflictError(
            'Payment state changed. Refresh before opening a dispute.'
          );
        if (disputeInsertError?.code === 'P0002')
          throw new NotFoundError('Escrow or job not found');
        if (disputeInsertError || !disputeRow) {
          logger.error('Failed to insert dispute record', {
            service: 'disputes',
            escrowId,
            error: disputeInsertError?.message,
          });
          throw new InternalServerError('Failed to create dispute');
        }

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
          { escrowId, disputeRecordId: disputeRow.dispute_id },
          idempotencyCheck?.ownership
        );

        return NextResponse.json(responseData);
      },
      idempotencyCheck?.ownership
    );
  }
);
