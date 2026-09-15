import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { createEscrowTransfer } from './EscrowTransferService';
import { verifyEscrowFunding } from './EscrowFundingService';

export interface ReleaseOperation {
  id: string;
  escrow_id: string;
  principal_minor: number;
  fee_minor: number;
  payout_minor: number;
  destination: string;
  state: 'reserved' | 'completed';
  transfer_id: string | null;
}
export function readAdminReleaseOperation(data: unknown): ReleaseOperation {
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
export async function recoverAdminRelease(
  op: ReleaseOperation,
  deadlineAt?: number
): Promise<ReleaseOperation> {
  if (op.state === 'completed') return op;
  let transferId: string | null = null;
  if (op.payout_minor > 0) {
    const transfer = await createEscrowTransfer(
      op.escrow_id,
      op.payout_minor,
      op.destination,
      deadlineAt
    );
    transferId = transfer.id;
  } else {
    await verifyEscrowFunding(op.escrow_id, deadlineAt);
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
  const final = readAdminReleaseOperation(settled);
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
  return final;
}
