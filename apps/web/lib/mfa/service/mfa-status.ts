if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] mfa-status.ts must not run in the browser');
}

import bcrypt from 'bcryptjs';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export async function recordVerificationAttempt(
  userId: string,
  method: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await serverSupabase.rpc('record_mfa_verification_attempt', {
      p_user_id: userId,
      p_method: method,
      p_success: success,
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || null,
    });
  } catch (error) {
    logger.error('Failed to record MFA attempt', error, {
      service: 'mfa',
      userId,
    });
  }
}

export async function verifyPendingCode(
  userId: string,
  code: string,
  method: 'sms' | 'email'
): Promise<boolean> {
  const { data: pending } = await serverSupabase
    .from('mfa_pending_verifications')
    .select('id, code_hash, expires_at')
    .eq('user_id', userId)
    .eq('method', method)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!pending) {
    return false;
  }

  const match = await bcrypt.compare(code, pending.code_hash);

  if (match) {
    // Delete used code
    await serverSupabase
      .from('mfa_pending_verifications')
      .delete()
      .eq('id', pending.id);
    return true;
  }

  return false;
}

/**
 * Disable MFA for user
 * Requires password confirmation (should be done at API level)
 */
export async function disableMFA(userId: string): Promise<void> {
  try {
    await serverSupabase.rpc('disable_user_mfa', { p_user_id: userId });

    logger.info('MFA disabled', {
      service: 'mfa',
      userId,
    });
  } catch (error) {
    logger.error('Failed to disable MFA', error, {
      service: 'mfa',
      userId,
    });
    throw error;
  }
}

/**
 * Get MFA status for user
 */
export async function getMFAStatus(userId: string) {
  try {
    const { data: user, error } = await serverSupabase
      .from('profiles')
      .select('mfa_enabled, mfa_method, mfa_enrolled_at, phone_number')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Get backup codes count
    const { data: backupCodesCount } = await serverSupabase.rpc(
      'get_unused_backup_codes_count',
      { p_user_id: userId }
    );

    // Get trusted devices count
    const { count: trustedDevicesCount } = await serverSupabase
      .from('trusted_devices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    return {
      enabled: user.mfa_enabled,
      method: user.mfa_method,
      enrolledAt: user.mfa_enrolled_at,
      phoneNumber: user.phone_number,
      backupCodesCount: backupCodesCount || 0,
      trustedDevicesCount: trustedDevicesCount || 0,
    };
  } catch (error) {
    logger.error('Failed to get MFA status', error, {
      service: 'mfa',
      userId,
    });
    throw error;
  }
}
