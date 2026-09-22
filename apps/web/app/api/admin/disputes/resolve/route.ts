import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/lib/errors/api-error';
import {
  FeeCalculationService,
  type PaymentType,
} from '@/lib/services/payment/FeeCalculationService';
import {
  readDisputeResolution,
  recoverDisputeSettlement,
} from '@/lib/services/payment/DisputeSettlementService';

const schema = z
  .object({
    escrowId: z.string().uuid(),
    decision: z.enum(['refund_homeowner', 'pay_contractor', 'split_50_50']),
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    rateLimit: { maxRequests: 20 },
  },
  async (request, { user }) => {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BadRequestError(
        'Provide a payment reference, resolution and reason (5–500 characters).'
      );
    await requireAdminFromDatabase(user.id);
    const { escrowId, decision, reason } = parsed.data;
    const { data: escrow, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id, payee_id, payment_type')
      .eq('id', escrowId)
      .single();
    if (error || !escrow)
      throw new NotFoundError('Escrow transaction not found');
    const tier = await FeeCalculationService.resolveContractorTier(
      escrow.payee_id
    );
    const feeRate = FeeCalculationService.calculateFees(100, {
      contractorTier: tier,
      paymentType: (escrow.payment_type || 'final') as PaymentType,
    }).platformFeeRate;
    const reservation = await serverSupabase.rpc('reserve_dispute_resolution', {
      p_admin_id: user.id,
      p_escrow_id: escrowId,
      p_decision: decision,
      p_reason: reason,
      p_fee_rate: feeRate,
    });
    if (reservation.error)
      throw new ConflictError(
        'Resolution cannot be reserved. Recover the existing decision or reconcile the dispute payment reference.'
      );
    const resolution = readDisputeResolution(reservation.data);
    if (
      resolution.escrow_id !== escrowId ||
      resolution.decision !== decision ||
      resolution.reason !== reason
    ) {
      throw new ConflictError(
        'Resolution reservation does not match the request'
      );
    }
    try {
      const outcome = await recoverDisputeSettlement(user.id, resolution);
      if (outcome.status === 'completed')
        return NextResponse.json({ success: true, ...outcome });
      return NextResponse.json(
        {
          success: false,
          ...outcome,
          message:
            outcome.status === 'requires_intervention'
              ? 'A payment requires reconciliation. The dispute is not resolved.'
              : 'Settlement is processing. Retry the same decision to check its status.',
        },
        { status: outcome.status === 'requires_intervention' ? 409 : 202 }
      );
    } catch (error) {
      if (error instanceof ConflictError) {
        return NextResponse.json(
          {
            success: false,
            status: 'requires_intervention',
            resolutionId: resolution.id,
            message:
              'Settlement requires administrator reconciliation. The dispute is not resolved.',
          },
          { status: 409 }
        );
      }
      // The provider may already have succeeded; durable reservations retain identity.
      return NextResponse.json(
        {
          success: false,
          status: 'processing',
          resolutionId: resolution.id,
          message:
            'Settlement is not confirmed. Retry the same decision to recover its status.',
        },
        { status: 202 }
      );
    }
  }
);
