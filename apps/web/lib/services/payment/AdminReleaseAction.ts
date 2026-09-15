import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
import {
  FeeCalculationService,
  type PaymentType,
} from './FeeCalculationService';
import { createEscrowTransfer } from './EscrowTransferService';
import { verifyEscrowFunding } from './EscrowFundingService';

interface ReleaseOperation {
  id: string;
  escrow_id: string;
  principal_minor: number;
  fee_minor: number;
  payout_minor: number;
  destination: string;
  state: 'reserved' | 'completed';
  transfer_id: string | null;
}
function readOperation(data: unknown): ReleaseOperation {
  const row = (Array.isArray(data) ? data[0] : data) as
    | ReleaseOperation
    | undefined;
  if (
    !row?.id ||
    !row.escrow_id ||
    !row.destination ||
    !Number.isSafeInteger(row.principal_minor) ||
    row.principal_minor <= 0 ||
    !Number.isSafeInteger(row.fee_minor) ||
    row.fee_minor < 0 ||
    !Number.isSafeInteger(row.payout_minor) ||
    row.payout_minor < 0 ||
    row.fee_minor + row.payout_minor !== row.principal_minor ||
    !['reserved', 'completed'].includes(row.state) ||
    (row.state === 'completed' &&
      (row.payout_minor > 0
        ? typeof row.transfer_id !== 'string' || !row.transfer_id.trim()
        : row.transfer_id !== null))
  )
    throw new InternalServerError('Release operation could not be verified');
  return row;
}
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
  const op = readOperation(data);
  if (op.escrow_id !== escrow.id)
    throw new ConflictError('Release reservation belongs to another payment');
  if (op.state === 'completed') return response(op);
  try {
    let transferId: string | null = null;
    if (op.payout_minor > 0) {
      const transfer = await createEscrowTransfer(
        op.escrow_id,
        op.payout_minor,
        op.destination
      );
      transferId = transfer.id;
    } else {
      await verifyEscrowFunding(op.escrow_id);
    }
    const { data: settled, error: settleError } = await serverSupabase.rpc(
      'finalize_admin_escrow_release',
      {
        p_operation_id: op.id,
        p_transfer_id: transferId,
      }
    );
    if (settleError)
      throw new InternalServerError('Release finalization needs recovery');
    const final = readOperation(settled);
    if (
      final.id !== op.id ||
      final.escrow_id !== op.escrow_id ||
      final.destination !== op.destination ||
      final.state !== 'completed' ||
      final.transfer_id !== transferId ||
      final.principal_minor !== op.principal_minor ||
      final.fee_minor !== op.fee_minor ||
      final.payout_minor !== op.payout_minor
    )
      throw new InternalServerError(
        'Release finalization did not match the operation'
      );
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
