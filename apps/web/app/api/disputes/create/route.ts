import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { DisputeWorkflowService, type DisputePriority } from '@/lib/services/disputes/DisputeWorkflowService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const createDisputeSchema = z.object({
  escrowId: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  evidence: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to create dispute');
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
      throw new NotFoundError('Escrow not found');
    }

    if (escrow.contractor_id !== user.id && escrow.client_id !== user.id) {
      throw new ForbiddenError('Not authorized to create dispute for this escrow');
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
  } catch (error) {
    return handleAPIError(error);
  }
}

