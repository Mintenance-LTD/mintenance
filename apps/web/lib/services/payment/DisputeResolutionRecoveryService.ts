import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
import {
  readDisputeResolution,
  recoverDisputeSettlement,
} from './DisputeSettlementService';

const claimSchema = z.object({
  id: z.string().uuid(),
  recovery_token: z.string().uuid(),
});

/** Resume saved decisions only. Database reservations recheck current admin authority. */
export async function runDisputeResolutionRecovery() {
  const deadlineAt = Date.now() + 25000;
  const result = { processed: 0, confirmed: 0, pending: 0, failed: 0 };
  while (result.processed < 3 && Date.now() < deadlineAt) {
    const { data, error } = await serverSupabase.rpc(
      'claim_dispute_resolution_recovery'
    );
    if (error)
      throw new InternalServerError(
        'Dispute recovery work could not be claimed'
      );
    if (data === null || (Array.isArray(data) && data.length === 0)) break;
    if (Array.isArray(data) && data.length !== 1) {
      throw new InternalServerError('Dispute recovery claim is ambiguous');
    }
    const row = Array.isArray(data) ? data[0] : data;
    const claim = claimSchema.safeParse(row);
    if (!claim.success)
      throw new InternalServerError('Dispute recovery ownership is missing');
    result.processed++;
    let recoveryError:
      | 'provider_unavailable'
      | 'reconciliation_required'
      | null = null;
    try {
      const admin = z.string().uuid().safeParse(row.initiated_by);
      if (!admin.success)
        throw new ConflictError('Dispute initiating administrator is missing');
      const resolution = readDisputeResolution(row);
      const outcome = await recoverDisputeSettlement(
        admin.data,
        resolution,
        deadlineAt
      );
      if (outcome.status === 'completed') result.confirmed++;
      else if (outcome.status === 'processing') result.pending++;
      else {
        result.failed++;
        recoveryError = 'reconciliation_required';
      }
    } catch (error) {
      result.failed++;
      recoveryError =
        error instanceof ConflictError
          ? 'reconciliation_required'
          : 'provider_unavailable';
    }
    const { data: acknowledged, error: acknowledgeError } =
      await serverSupabase.rpc('finish_dispute_resolution_recovery', {
        p_resolution_id: claim.data.id,
        p_token: claim.data.recovery_token,
        p_error: recoveryError,
      });
    if (acknowledgeError || acknowledged !== true) {
      throw new InternalServerError('Dispute recovery acknowledgement failed');
    }
  }
  return result;
}
