if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] mfa-sessions.ts must not run in the browser');
}

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { PRE_MFA_SESSION_DURATION } from './constants';
import { generateSecureToken } from './tokens';
import type { PreMFASession } from './types';

/**
 * Create pre-MFA session token
 * Used after password verification but before MFA completion
 */
export async function createPreMFASession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<PreMFASession> {
  try {
    const sessionToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + PRE_MFA_SESSION_DURATION);

    const { error } = await serverSupabase.from('pre_mfa_sessions').insert({
      user_id: userId,
      session_token: sessionToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      logger.error('Failed to create pre-MFA session', error, {
        service: 'mfa',
        userId,
      });
      throw new Error('Failed to create pre-MFA session');
    }

    logger.info('Pre-MFA session created', {
      service: 'mfa',
      userId,
    });

    return { sessionToken, expiresAt };
  } catch (error) {
    logger.error('Pre-MFA session creation failed', error, {
      service: 'mfa',
      userId,
    });
    throw error;
  }
}

/**
 * Validate pre-MFA session token
 * Returns user ID if valid, null otherwise
 */
export async function validatePreMFASession(
  sessionToken: string
): Promise<string | null> {
  try {
    const { data, error } = await serverSupabase
      .from('pre_mfa_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (error || !data) {
      return null;
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      // Clean up expired session
      await serverSupabase
        .from('pre_mfa_sessions')
        .delete()
        .eq('session_token', sessionToken);
      return null;
    }

    return data.user_id;
  } catch (error) {
    logger.error('Pre-MFA session validation failed', error, {
      service: 'mfa',
    });
    return null;
  }
}

/**
 * Delete pre-MFA session (after successful MFA or expiration)
 */
export async function deletePreMFASession(sessionToken: string): Promise<void> {
  try {
    await serverSupabase
      .from('pre_mfa_sessions')
      .delete()
      .eq('session_token', sessionToken);
  } catch (error) {
    logger.error('Failed to delete pre-MFA session', error, {
      service: 'mfa',
    });
  }
}
