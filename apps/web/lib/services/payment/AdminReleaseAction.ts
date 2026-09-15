import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError } from '@/lib/errors/api-error';
import {
  FeeCalculationService,
  type PaymentType,
} from './FeeCalculationService';
import {
  readAdminReleaseOperation,
  recoverAdminRelease,
  type ReleaseOperation,
} from './AdminReleaseService';

function response(op: ReleaseOperation) {
  return NextResponse.json({
    success: true,
    status: 'completed',
    operationId: op.id,
    transferId: op.transfer_id,
    amount: op.principal_minor / 100,
    contractorPayout: op.payout_minor / 100,
    platformFee: op.fee_minor / 100,
    message: 'Payment release confirmed.',
  });
}

export async function performAdminReleaseAction(input: {
  escrow: { id: string; payee_id: string; payment_type?: string | null };
  user: { id: string };
  reason: string;
}) {
  const { escrow, user, reason } = input;
  if (!escrow.payee_id)
    throw new ConflictError('Payment recipient requires reconciliation');
  const tier = await FeeCalculationService.resolveContractorTier(
    escrow.payee_id
  );
  const feeRate = FeeCalculationService.calculateFees(100, {
    contractorTier: tier,
    paymentType: (escrow.payment_type || 'final') as PaymentType,
  }).platformFeeRate;
  const { data, error } = await serverSupabase.rpc(
    'reserve_admin_escrow_release',
    {
      p_admin_id: user.id,
      p_escrow_id: escrow.id,
      p_reason: reason,
      p_fee_rate: feeRate,
    }
  );
  if (error)
    throw new ConflictError(
      'Release cannot be reserved. Recover any existing payment operation first.'
    );
  const op = readAdminReleaseOperation(data);
  if (op.escrow_id !== escrow.id)
    throw new ConflictError('Release reservation belongs to another payment');
  if (op.state === 'completed') return response(op);
  try {
    const final = await recoverAdminRelease(op);
    return response(final);
  } catch {
    // The provider may have succeeded. The frozen operation remains claimed;
    // another attempt recovers the same provider transfer and DB finalization.
    return NextResponse.json(
      {
        success: false,
        status: 'processing',
        operationId: op.id,
        message:
          'Payment release is not confirmed. Retry the same action to check its status.',
      },
      { status: 202 }
    );
  }
}
