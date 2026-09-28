import { createHash } from 'crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const pushTokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export async function recordPushReceipt(
  id: string,
  userId: string,
  deviceId: string,
  token: string
) {
  const { error } = await serverSupabase.from('push_delivery_receipts').insert({
    id,
    user_id: userId,
    device_id: deviceId,
    token_hash: pushTokenHash(token),
  });
  if (error && error.code !== '23505')
    throw new Error('Push receipt recording failed');
}

/** Bounded, replay-safe polling; never resends a notification. */
export async function processPushReceipts() {
  const now = new Date();
  const deadline = Date.now() + 40000;
  const { data: rows, error } = await serverSupabase
    .from('push_delivery_receipts')
    .select('id,user_id,device_id,token_hash,created_at')
    .eq('status', 'pending')
    .lte('next_check_at', now.toISOString())
    .order('next_check_at')
    .limit(100);
  if (error) throw new Error('Push receipt queue unavailable');
  const result = { checked: 0, accepted: 0, failed: 0, expired: 0, pending: 0 };
  if (rows?.length) {
    const response = await fetch(
      'https://exp.host/--/api/v2/push/getReceipts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: rows.map((row) => row.id) }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!response.ok) throw new Error('Push receipt provider unavailable');
    const payload = await response.json();
    if (
      !payload?.data ||
      typeof payload.data !== 'object' ||
      Array.isArray(payload.data)
    )
      throw new Error('Invalid push receipt response');
    for (const row of rows) {
      if (Date.now() >= deadline) break;
      const receipt = payload.data[row.id];
      const expired =
        now.getTime() - new Date(row.created_at).getTime() >=
        24 * 60 * 60 * 1000;
      let status = 'pending';
      let code: string | null = null;
      if (receipt?.status === 'ok') {
        status = 'provider_accepted';
      } else if (receipt?.status === 'error') {
        status = 'provider_error';
        const knownCodes = [
          'DeviceNotRegistered',
          'MessageTooBig',
          'MessageRateExceeded',
          'MismatchSenderId',
          'InvalidCredentials',
        ];
        code = knownCodes.includes(receipt.details?.error)
          ? receipt.details.error
          : 'provider_error';
        if (code === 'DeviceNotRegistered') {
          const { data: device, error: lookupError } = await serverSupabase
            .from('user_push_tokens')
            .select('push_token')
            .eq('id', row.device_id)
            .eq('user_id', row.user_id)
            .maybeSingle();
          if (lookupError)
            throw new Error('Push token reconciliation unavailable');
          if (device && pushTokenHash(device.push_token) === row.token_hash) {
            const { error: deleteError } = await serverSupabase
              .from('user_push_tokens')
              .delete()
              .eq('id', row.device_id)
              .eq('user_id', row.user_id)
              .eq('push_token', device.push_token);
            if (deleteError)
              throw new Error('Push token reconciliation failed');
          }
        }
      } else if (expired) {
        status = 'expired';
        code = 'receipt_unavailable';
      }
      const { data: changed, error: updateError } = await serverSupabase
        .from('push_delivery_receipts')
        .update({
          status,
          error_code: code,
          checked_at: now.toISOString(),
          next_check_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        })
        .eq('id', row.id)
        .eq('status', 'pending')
        .select('id');
      if (updateError) throw new Error('Push receipt result not recorded');
      if (!changed?.length) continue;
      result.checked++;
      if (status === 'provider_accepted') result.accepted++;
      else if (status === 'provider_error') result.failed++;
      else if (status === 'expired') result.expired++;
      else result.pending++;
    }
  }
  const { error: cleanupError } = await serverSupabase
    .from('push_delivery_receipts')
    .delete()
    .neq('status', 'pending')
    .lt(
      'checked_at',
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );
  if (cleanupError) throw new Error('Push receipt cleanup failed');
  return result;
}
