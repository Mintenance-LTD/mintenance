if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] mfa-totp.ts must not run in the browser');
}

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { encryptField } from '@/lib/encryption/field-encryption';

import {
  TOTP_WINDOW,
  TOTP_ISSUER,
  TOTP_ALGORITHM,
  TOTP_DIGITS,
  TOTP_PERIOD,
  TOTP_SECRET_SIZE,
} from './constants';
import { tryDecryptTOTPSecret } from './totp-crypto';
import { createBackupCodeArray } from './backup-codes';
import { storeBackupCodes } from './mfa-recovery';
import { recordVerificationAttempt, verifyPendingCode } from './mfa-status';
import { verifyBackupCode } from './mfa-recovery';
import type { TOTPEnrollmentData, MFAVerificationResult } from './types';

/**
 * Enroll user in TOTP MFA
 * Generates secret and QR code for authenticator app setup
 */
export async function enrollTOTP(userId: string): Promise<TOTPEnrollmentData> {
  try {
    // Get user information for QR code label
    const { data: user, error: userError } = await serverSupabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logger.error('Failed to get user for TOTP enrollment', userError, {
        service: 'mfa',
        userId,
      });
      throw new Error('User not found');
    }

    // Generate TOTP secret using otpauth
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      label: user.email,
      algorithm: TOTP_ALGORITHM,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD,
      secret: new OTPAuth.Secret({ size: TOTP_SECRET_SIZE }),
    });

    const secret = {
      base32: totp.secret.base32,
      otpauth_url: totp.toString(),
    };

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = createBackupCodeArray();

    // Encrypt TOTP secret at rest using AES-256-GCM before storing
    const encryptedSecret = encryptField(secret.base32, 'totp_secret');
    const { error: updateError } = await serverSupabase
      .from('profiles')
      .update({
        totp_secret: JSON.stringify(encryptedSecret),
        mfa_method: 'totp',
        mfa_enrolled_at: new Date().toISOString(),
        // Don't enable MFA yet - wait for verification
      })
      .eq('id', userId);

    if (updateError) {
      logger.error('Failed to store TOTP secret', updateError, {
        service: 'mfa',
        userId,
      });
      throw new Error('Failed to store TOTP secret');
    }

    // Store backup codes (hashed)
    await storeBackupCodes(userId, backupCodes);

    logger.info('TOTP enrollment initiated', {
      service: 'mfa',
      userId,
      email: user.email,
    });

    return {
      secret: secret.base32,
      qrCodeDataUrl,
      backupCodes,
    };
  } catch (error) {
    logger.error('TOTP enrollment failed', error, {
      service: 'mfa',
      userId,
    });
    throw error;
  }
}

/**
 * Verify TOTP enrollment
 * Confirms user can successfully use their authenticator app
 */
export async function verifyTOTPEnrollment(
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's TOTP secret
    const { data: user, error: userError } = await serverSupabase
      .from('profiles')
      .select('totp_secret, mfa_enabled')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.totp_secret) {
      return { success: false, error: 'TOTP not set up' };
    }

    // Don't allow re-enrollment if already enabled
    if (user.mfa_enabled) {
      return { success: false, error: 'MFA already enabled' };
    }

    // Decrypt secret (handles both encrypted and legacy plaintext values)
    const plainSecret = tryDecryptTOTPSecret(user.totp_secret);

    // Verify token using otpauth (constant-time comparison)
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      algorithm: TOTP_ALGORITHM,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD,
      secret: OTPAuth.Secret.fromBase32(plainSecret),
    });

    const delta = totp.validate({ token, window: TOTP_WINDOW });
    const verified = delta !== null;

    if (!verified) {
      await recordVerificationAttempt(userId, 'totp', false);
      return { success: false, error: 'Invalid verification code' };
    }

    // Enable MFA
    const { error: updateError } = await serverSupabase
      .from('profiles')
      .update({
        mfa_enabled: true,
      })
      .eq('id', userId);

    if (updateError) {
      logger.error('Failed to enable MFA', updateError, {
        service: 'mfa',
        userId,
      });
      throw new Error('Failed to enable MFA');
    }

    await recordVerificationAttempt(userId, 'totp', true);

    logger.info('TOTP enrollment completed', {
      service: 'mfa',
      userId,
    });

    return { success: true };
  } catch (error) {
    logger.error('TOTP verification failed', error, {
      service: 'mfa',
      userId,
    });
    throw error;
  }
}

async function verifyTOTPCode(userId: string, token: string): Promise<boolean> {
  const { data: user } = await serverSupabase
    .from('profiles')
    .select('totp_secret')
    .eq('id', userId)
    .single();

  if (!user || !user.totp_secret) {
    return false;
  }

  // Decrypt secret (handles both encrypted and legacy plaintext values)
  const plainSecret = tryDecryptTOTPSecret(user.totp_secret);

  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(plainSecret),
  });

  const delta = totp.validate({ token, window: TOTP_WINDOW });
  return delta !== null;
}

/**
 * Verify MFA code during login
 * Supports TOTP, backup codes, SMS, and email
 */
export async function verifyMFA(
  userId: string,
  code: string,
  method: 'totp' | 'backup_code' | 'sms' | 'email',
  ipAddress?: string,
  userAgent?: string
): Promise<MFAVerificationResult> {
  try {
    // Check rate limiting
    const { data: rateLimitOk } = await serverSupabase.rpc(
      'check_mfa_rate_limit',
      { p_user_id: userId }
    );

    if (!rateLimitOk) {
      logger.warn('MFA rate limit exceeded', {
        service: 'mfa',
        userId,
        method,
      });
      return {
        success: false,
        error: 'Too many failed attempts. Please try again in 15 minutes.',
      };
    }

    let verified = false;
    let requiresNewBackupCodes = false;

    switch (method) {
      case 'totp':
        verified = await verifyTOTPCode(userId, code);
        break;

      case 'backup_code': {
        const backupResult = await verifyBackupCode(userId, code);
        verified = backupResult.verified;
        requiresNewBackupCodes = backupResult.requiresNewCodes;
        break;
      }

      case 'sms':
      case 'email':
        verified = await verifyPendingCode(userId, code, method);
        break;

      default:
        return { success: false, error: 'Invalid MFA method' };
    }

    // Record attempt
    await recordVerificationAttempt(
      userId,
      method,
      verified,
      ipAddress,
      userAgent
    );

    if (!verified) {
      return { success: false, error: 'Invalid verification code' };
    }

    logger.info('MFA verification successful', {
      service: 'mfa',
      userId,
      method,
    });

    return { success: true, requiresNewBackupCodes };
  } catch (error) {
    logger.error('MFA verification failed', error, {
      service: 'mfa',
      userId,
      method,
    });
    throw error;
  }
}
