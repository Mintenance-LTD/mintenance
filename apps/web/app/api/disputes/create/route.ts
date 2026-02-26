import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { DisputeWorkflowService, type DisputePriority } from '@/lib/services/disputes/DisputeWorkflowService';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError, InternalServerError } from '@/lib/errors/api-error';

const createDisputeSchema = z.object({
  escrowId: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  evidence: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

/**
 * POST /api/disputes/create
 * Create a new dispute for an escrow transaction
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, createDisputeSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, reason, description, evidence, priority } = validation.data;

    // Verify user has access to this escrow
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, contractor_id, client_id, status')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow not found');
    }

    if (escrow.contractor_id !== user.id && escrow.client_id !== user.id) {
      throw new ForbiddenError('Not authorized to create dispute for this escrow');
    }

    // Update escrow to disputed status
    const { error: disputeError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'disputed',
        dispute_reason: reason,
        dispute_evidence: evidence || [],
      })
      .eq('id', escrowId);

    if (disputeError) {
      logger.error('Failed to create dispute', {
        service: 'disputes',
        escrowId,
        error: disputeError.message,
      });
      throw new InternalServerError('Failed to create dispute');
    }

    // Set priority and SLA
    await DisputeWorkflowService.setDisputePriority(escrowId, priority as DisputePriority);

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
    });
  }
);
