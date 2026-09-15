import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { verifyEscrowFunding } from './EscrowFundingService';
interface FeeOnlySettlement {
  id: string;
  escrow_id: string;
  principal_minor: number;
  created_at: string;
}
function validate(
  value: FeeOnlySettlement | undefined,
  escrowId: string
): FeeOnlySettlement {
  if (
    !value?.id ||
    value.escrow_id !== escrowId ||
    !Number.isSafeInteger(value.principal_minor) ||
    value.principal_minor < 1 ||
    value.principal_minor > 50 ||
    !Number.isFinite(Date.parse(value.created_at))
  ) {
    throw new InternalServerError('Payment settlement requires reconciliation');
  }
  return value;
}
/** Call only after the route has authorized the current escrow participant. */
export async function readFeeOnlySettlement(
  escrowId: string
): Promise<FeeOnlySettlement | null> {
  const { data, error } = await serverSupabase
    .from('escrow_fee_only_settlements')
    .select('id,escrow_id,principal_minor,created_at')
    .eq('escrow_id', escrowId)
    .maybeSingle();
  if (error)
    throw new InternalServerError('Payment settlement could not be confirmed');
  return data ? validate(data, escrowId) : null;
}
export async function settleFeeOnlyEscrow(
  escrowId: string,
  feeMinor: number,
  actorId: string | null
): Promise<FeeOnlySettlement> {
  if (!Number.isSafeInteger(feeMinor) || feeMinor < 1 || feeMinor > 50)
    throw new InternalServerError('Invalid fee-only settlement amount');
  try {
    await verifyEscrowFunding(escrowId);
    const { data, error } = await serverSupabase.rpc('settle_fee_only_escrow', {
      p_escrow_id: escrowId,
      p_fee_minor: feeMinor,
      p_actor_id: actorId,
    });
    if (error)
      throw new InternalServerError(
        'Payment settlement could not be confirmed. Retry to check its status.'
      );
    const settled = validate(data?.[0], escrowId);
    if (settled.principal_minor !== feeMinor)
      throw new InternalServerError('Payment settlement terms changed');
    return settled;
  } catch (error) {
    // No provider mutation occurs in this path. A committed settlement is already
    // completed and cannot match this conditional rollback; an uncommitted claim
    // can be retried. The database additionally forbids reopening settled rows.
    await serverSupabase
      .from('escrow_transactions')
      .update({ status: 'held', updated_at: new Date().toISOString() })
      .eq('id', escrowId)
      .eq('status', 'release_pending');
    throw error;
  }
}
export function feeOnlyReleaseResponse(
  settlement: FeeOnlySettlement,
  originalAmount: number,
  contractorId: string
) {
  return {
    success: true,
    transferId: null,
    settlementId: settlement.id,
    settlementType: 'fee_only',
    originalAmount,
    platformFee: settlement.principal_minor / 100,
    contractorAmount: 0,
    contractorId,
    releasedAt: settlement.created_at,
  };
}
