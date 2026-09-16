import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
import {
  readAdminReleaseOperation,
  recoverAdminRelease,
} from './AdminReleaseService';

/** Recover already authorized, frozen releases; never create new authorizations. */
export async function runAdminReleaseRecovery() {
  const deadlineAt = Date.now() + 25000;
  const result = { processed: 0, confirmed: 0, failed: 0 };
  while (result.processed < 3 && Date.now() < deadlineAt) {
    const { data, error } = await serverSupabase.rpc(
      'claim_admin_release_recovery'
    );
    if (error)
      throw new InternalServerError(
        'Release recovery work could not be claimed'
      );
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) break;
    const operation = readAdminReleaseOperation(row);
    if (typeof row.recovery_token !== 'string' || !row.recovery_token)
      throw new InternalServerError('Release recovery ownership is missing');
    result.processed++;
    let recoveryError: string | null = null;
    try {
      await recoverAdminRelease(operation, deadlineAt);
      result.confirmed++;
    } catch (error) {
      recoveryError =
        error instanceof ConflictError
          ? 'reconciliation_required'
          : 'provider_unavailable';
      result.failed++;
    }
    const { data: acknowledged, error: acknowledgeError } =
      await serverSupabase.rpc('finish_admin_release_recovery', {
        p_operation_id: operation.id,
        p_token: row.recovery_token,
        p_error: recoveryError,
      });
    if (acknowledgeError || acknowledged !== true)
      throw new InternalServerError('Release recovery acknowledgement failed');
  }
  return result;
}
