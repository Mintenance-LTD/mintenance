import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { Session } from '@supabase/supabase-js';
import type { User } from '@mintenance/types';
import { validateToken } from './jwt';
import { getCurrentUser } from './profile-fetch';

/**
 * Biometric session restore extracted from `services/AuthService.ts`
 * on 2026-05-09.
 *
 * Two paths:
 *   - Refresh-only (preferred): BiometricService stores only the
 *     refresh token. Use `supabase.auth.refreshSession` to mint a
 *     fresh access+refresh pair. Lifetime is server-controlled.
 *   - Full token restore (legacy): caller has both access+refresh.
 *     Validate the access token via Supabase JWKS first so a tampered
 *     stored value is rejected before we hand it to setSession.
 *
 * On any failure, the function throws a user-friendly Error string —
 * the calling UI shows it verbatim in a toast / alert.
 */
export async function restoreSessionFromBiometricTokens({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string;
}): Promise<{ user: User | null; session: Session | null }> {
  if (!refreshToken) {
    throw new Error(
      'We could not restore your session. Please sign in with your password.'
    );
  }

  try {
    if (!accessToken) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logger.warn('Biometric refresh-only session restoration failed', {
          error: error.message,
          service: 'auth',
        });
        throw new Error('Your session has expired. Please sign in again.');
      }

      if (!data.session) {
        throw new Error('Failed to restore session from refresh token.');
      }

      const user = await getCurrentUser();
      return { user, session: data.session };
    }

    const tokenValidation = await validateToken(accessToken);

    if (!tokenValidation.valid) {
      logger.warn('Biometric token validation failed', {
        error: tokenValidation.error,
        errorType: tokenValidation.errorType || 'unknown',
        userId: tokenValidation.userId || 'unknown',
        tokenExpiry: tokenValidation.expiresAt
          ? new Date(tokenValidation.expiresAt * 1000).toISOString()
          : 'unknown',
        currentTime: new Date().toISOString(),
        service: 'auth',
      });

      const errorMessage =
        tokenValidation.errorType === 'expired'
          ? 'Your session has expired. Please sign in again.'
          : tokenValidation.errorType === 'invalid'
            ? 'Invalid credentials detected. Please sign in again.'
            : 'Stored credentials are invalid or expired. Please sign in again.';
      throw new Error(errorMessage);
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;

    const session = data.session;
    const user = await getCurrentUser();

    if (!user || user.id !== tokenValidation.userId) {
      logger.error('User mismatch after biometric session restoration', {
        expectedUserId: tokenValidation.userId,
        actualUserId: user?.id,
        service: 'auth',
      });
      throw new Error('Session restoration failed. Please sign in again.');
    }

    return { user, session };
  } catch (error) {
    logger.error('Failed to restore session from biometric tokens', error);
    throw new Error('Unable to restore session from biometric credentials.');
  }
}
