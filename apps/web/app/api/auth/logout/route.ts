import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { logger } from '@mintenance/shared';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { auth: false, csrf: true, rateLimit: { maxRequests: 5 } },
  async (request) => {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('__Host-mintenance-auth')?.value;
    const refreshToken = cookieStore.get('__Host-mintenance-refresh')?.value;

    // Best-effort extract userId from current access token so we can revoke
    // every refresh token for this user in the database. If the access token
    // is already expired / malformed we still want to clear cookies & blacklist
    // what we have, so failures here are logged but non-fatal.
    let userId: string | undefined;
    if (authToken) {
      try {
        const payload = await verifyToken(authToken);
        userId = payload?.sub;
      } catch (error) {
        logger.warn('Could not decode access token on logout (continuing)', {
          service: 'auth',
        });
      }
    }

    // Blacklist the access token
    if (authToken) {
      try {
        await tokenBlacklist.blacklistToken(authToken);
        logger.info('Access token blacklisted on logout', {
          service: 'auth',
          userId,
        });
      } catch (error) {
        logger.error('Failed to blacklist access token on logout', error, {
          service: 'auth',
        });
        // Continue with logout even if blacklisting fails
      }
    }

    // Also blacklist the refresh token value so a stolen refresh cookie can't
    // mint new access tokens even if the DB revoke below races or fails.
    // Refresh tokens are opaque strings; the blacklist uses the last 32 chars
    // as the key so opaque strings work fine.
    if (refreshToken) {
      try {
        await tokenBlacklist.blacklistToken(refreshToken);
        logger.info('Refresh token blacklisted on logout', {
          service: 'auth',
          userId,
        });
      } catch (error) {
        logger.error('Failed to blacklist refresh token on logout', error, {
          service: 'auth',
        });
      }
    }

    // AuthManager.logout(userId) revokes all refresh_tokens rows for this user
    // via revokeAllTokens(). Without a userId it only clears cookies, which
    // leaves stolen refresh tokens valid until their natural expiry.
    await authManager.logout(userId);

    // 2026-05-26 audit-56 P0: bump profiles.tokens_revoked_at so any
    // access JWT issued before now is rejected by verifyToken's durable
    // cutoff check. The in-memory blacklist doesn't survive serverless
    // cold starts; this DB-backed cutoff does. Without this, a user
    // who clicked Sign Out could still authenticate via a still-valid
    // cookie for up to ACCESS_TTL_SEC (1 hour) after logout.
    if (userId) {
      try {
        const { serverSupabase } = await import('@/lib/api/supabaseServer');
        await serverSupabase
          .from('profiles')
          .update({ tokens_revoked_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (revokeErr) {
        // Non-fatal: cookies are still cleared on the response; we
        // just lose the durable backstop for this session. The blacklist
        // + cookie deletion still apply.
        logger.warn(
          'Failed to bump profiles.tokens_revoked_at on logout (non-fatal)',
          {
            service: 'auth',
            userId,
            err:
              revokeErr instanceof Error
                ? revokeErr.message
                : String(revokeErr),
          }
        );
      }
    }

    logger.info('User logged out successfully', { service: 'auth', userId });

    const response = NextResponse.json(
      {
        message: 'Logout successful',
        clearSession: true, // Signal client to clear SessionManager
      },
      { status: 200 }
    );

    return response;
  }
);
