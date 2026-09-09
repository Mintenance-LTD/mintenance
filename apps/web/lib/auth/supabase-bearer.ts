import { decodeJwt } from 'jose';
import type { JWTPayload } from '@mintenance/types';
import { createAnonClient, serverSupabase } from '@/lib/api/supabaseServer';

/** Verify via Supabase before using claims; metadata never supplies authority. */
export async function verifySupabaseBearer(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { data, error } = await createAnonClient().auth.getUser(token);
    if (error || !data.user) return null;
    const claims = decodeJwt(token);
    if (
      claims.sub !== data.user.id ||
      typeof claims.session_id !== 'string' ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number' ||
      !Number.isSafeInteger(claims.iat) ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= Date.now() / 1000 ||
      claims.iat > Date.now() / 1000 + 30
    )
      return null;
    const { data: context, error: contextError } = await serverSupabase.rpc(
      'verified_mobile_session_context',
      {
        p_user_id: data.user.id,
        p_session_id: claims.session_id,
        p_issued_at: claims.iat,
      }
    );
    const row = Array.isArray(context) ? context[0] : context;
    if (
      contextError ||
      !row ||
      !['homeowner', 'contractor', 'admin'].includes(row.profile_role)
    )
      return null;
    const sessionStart = Number(row.session_start_ms);
    const lastActivity = Number(row.last_activity_ms);
    if (
      !Number.isFinite(sessionStart) ||
      !Number.isFinite(lastActivity) ||
      sessionStart <= 0 ||
      lastActivity <= 0
    )
      return null;
    return {
      sub: data.user.id,
      email: data.user.email ?? '',
      role: row.profile_role,
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      iat: claims.iat,
      exp: claims.exp,
      sessionStart,
      lastActivity,
    };
  } catch {
    return null;
  }
}
