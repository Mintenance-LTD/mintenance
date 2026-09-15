import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
import { operationFrom, recoverRefund } from './RefundService';

/** Durable leases survive process loss; provider outcomes remain authoritative. */
export async function runRefundRecovery() {
  const deadlineAt = Date.now() + 25000;
  const result = { processed: 0, confirmed: 0, pending: 0, failed: 0 };
  while (result.processed < 3 && Date.now() < deadlineAt) {
    const { data, error } = await serverSupabase.rpc('claim_refund_recovery');
    if (error)
      throw new InternalServerError(
        'Refund recovery work could not be claimed'
      );
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) break;
    const operation = operationFrom(row);
    if (typeof row.recovery_token !== 'string' || !row.recovery_token)
      throw new InternalServerError('Refund recovery ownership is missing');
    result.processed++;
    let recoveryError: string | null = null;
    try {
      const outcome = await recoverRefund(operation, deadlineAt);
      if (outcome.state === 'succeeded') result.confirmed++;
      else if (
        ['pending', 'requires_action', 'reserved'].includes(outcome.state)
      )
        result.pending++;
      else result.failed++;
    } catch (error) {
      recoveryError =
        error instanceof ConflictError
          ? 'reconciliation_required'
          : 'provider_unavailable';
      result.failed++;
    }
    const { data: acknowledged, error: acknowledgeError } =
      await serverSupabase.rpc('finish_refund_recovery', {
        p_operation_id: operation.id,
        p_token: row.recovery_token,
        p_error: recoveryError,
      });
    if (acknowledgeError || acknowledged !== true)
      throw new InternalServerError('Refund recovery acknowledgement failed');
  }
  return result;
}
