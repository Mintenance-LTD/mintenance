import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { DisputeWorkflowService } from '@/lib/services/disputes/DisputeWorkflowService';
import { logger } from '@mintenance/shared';

const createDisputeSchema = z.object({
  escrowId: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  evidence: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await validateRequest(request, createDisputeSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, reason, description, evidence, priority } = validation.data;

    // Verify user has access to this escrow
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_payments')
      .select('id, contractor_id, client_id, status')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    if (escrow.contractor_id !== user.id && escrow.client_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update escrow to disputed status
    const { error: disputeError } = await serverSupabase
      .from('escrow_payments')
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
      return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 });
    }

    // Set priority and SLA
    await DisputeWorkflowService.setDisputePriority(escrowId, priority);

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
  } catch (error) {
    logger.error('Error creating dispute', error, { service: 'disputes' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

