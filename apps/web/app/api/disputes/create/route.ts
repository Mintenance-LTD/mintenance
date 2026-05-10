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

const createDisputeSchema = z.object({
  escrowId: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  evidence: z.array(z.string()).optional(),
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

    const against =
      escrow.payer_id === user.id ? escrow.payee_id : escrow.payer_id;

    // Update escrow status — only writing columns that exist on this table
    const { error: escrowUpdateError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'disputed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowId);

    if (escrowUpdateError) {
      logger.error('Failed to update escrow to disputed', {
        service: 'disputes',
        escrowId,
        error: escrowUpdateError.message,
      });
      throw new InternalServerError('Failed to create dispute');
    }

    // Persist canonical dispute record. The `disputes` table has no
    // dedicated evidence column, so we append a numbered evidence list
    // to `description` to avoid silently dropping client-provided URLs.
    const evidenceSummary =
      evidence && evidence.length > 0
        ? `\n\nEvidence:\n${evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
        : '';

    const { data: disputeRow, error: disputeInsertError } = await serverSupabase
      .from('disputes')
      .insert({
        job_id: escrow.job_id,
        raised_by: user.id,
        against,
        reason,
        description: `${description}${evidenceSummary}`,
        status: 'open',
      })
      .select('id')
      .single();

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

    return NextResponse.json({
      message: 'Dispute created successfully',
      disputeId: escrowId,
      disputeRecordId: disputeRow.id,
    });
  }
);
