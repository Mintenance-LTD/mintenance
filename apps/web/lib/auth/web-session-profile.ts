import type { JWTPayload } from '@mintenance/types';
import { serverSupabase } from '@/lib/api/supabaseServer';

/** Verify the current profile and durable cutoff for an already verified JWT. */
export async function isLiveWebSession(payload: JWTPayload): Promise<boolean> {
  if (!payload.sub || !Number.isSafeInteger(payload.iat) || payload.iat <= 0)
    return false;
  const startedAt = payload.sessionStart ?? payload.iat * 1000;
  if (
    !Number.isSafeInteger(startedAt) ||
    startedAt <= 0 ||
    startedAt > payload.iat * 1000 + 999
  )
    return false;

  try {
    const { data: profile, error } = await serverSupabase
      .from('profiles')
      .select('deleted_at, tokens_revoked_at')
      .eq('id', payload.sub)
      .maybeSingle();
    if (error || !profile || profile.deleted_at) return false;
    if (!profile.tokens_revoked_at) return true;
    const cutoff = new Date(profile.tokens_revoked_at).getTime();
    return Number.isFinite(cutoff) && startedAt >= cutoff;
  } catch {
    return false;
  }
}
