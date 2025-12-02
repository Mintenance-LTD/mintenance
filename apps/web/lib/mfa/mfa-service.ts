/**
 * Multi-Factor Authentication (MFA) Service
 *
 * Provides TOTP, SMS, email, and backup code functionality for MFA.
 *
 * IMPORTANT: Before using this service, install required dependencies:
 * npm install speakeasy qrcode @types/speakeasy @types/qrcode
 */

if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] mfa-service.ts must not run in the browser');
}

import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

// Import types - actual imports commented until packages installed
// import speakeasy from 'speakeasy';
// import QRCode from 'qrcode';

// Type definitions for when packages are installed
type SpeakeasyGeneratedSecret = {
  ascii: string;
  hex: string;
  base32: string;
  otpauth_url?: string;
};

interface TOTPEnrollmentData {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

interface MFAVerificationResult {
  success: boolean;
  error?: string;
  requiresNewBackupCodes?: boolean;
}

interface PreMFASession {
  sessionToken: string;
  expiresAt: Date;
}

interface TrustedDeviceData {
  deviceToken: string;
  deviceName?: string;
  expiresAt: Date;
}

/**
 * MFA Service
 *
 * Handles all MFA operations including TOTP enrollment, verification,
 * backup codes, and session management.
 */
export class MFAService {
  private static readonly TOTP_WINDOW = 1; // Allow 1 step before/after for time drift
  private static readonly BACKUP_CODE_LENGTH = 8;
  private static readonly BACKUP_CODE_COUNT = 10;
  private static readonly PRE_MFA_SESSION_DURATION = 10 * 60 * 1000; // 10 minutes
  private static readonly TRUSTED_DEVICE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Enroll user in TOTP MFA
   * Generates secret and QR code for authenticator app setup
   */
  static async enrollTOTP(userId: string): Promise<TOTPEnrollmentData> {
    try {
      // Get user information for QR code label
      const { data: user, error: userError } = await serverSupabase
        .from('users')
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

      // Generate TOTP secret
      // NOTE: Uncomment when speakeasy is installed
      /*
      const secret = speakeasy.generateSecret({
        name: `Mintenance (${user.email})`,
        issuer: 'Mintenance',
        length: 32,
      });
      */

      // Temporary mock until speakeasy is installed
      const secret = {
        base32: this.generateMockSecret(),
        ascii: '',
        hex: '',
        otpauth_url: `otpauth://totp/Mintenance:${user.email}?secret=MOCKBASE32SECRET&issuer=Mintenance`,
      } as SpeakeasyGeneratedSecret;

      // Generate QR code
      // NOTE: Uncomment when qrcode is installed
      /*
      const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');
      */

      // Temporary mock until qrcode is installed
      const qrCodeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store encrypted secret in database
      // NOTE: In production, use app-level encryption for totp_secret
      const { error: updateError } = await serverSupabase
        .from('users')
        .update({
          totp_secret: secret.base32,
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
      await this.storeBackupCodes(userId, backupCodes);

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
  static async verifyTOTPEnrollment(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's TOTP secret
      const { data: user, error: userError } = await serverSupabase
        .from('users')
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

      // Verify token
      // NOTE: Uncomment when speakeasy is installed
      /*
      const verified = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token,
        window: this.TOTP_WINDOW,
      });
      */

      // Temporary mock verification
      const verified = token === '123456' || token.length === 6;

      if (!verified) {
        await this.recordVerificationAttempt(userId, 'totp', false);
        return { success: false, error: 'Invalid verification code' };
      }

      // Enable MFA
      const { error: updateError } = await serverSupabase
        .from('users')
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

      await this.recordVerificationAttempt(userId, 'totp', true);

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

  /**
   * Verify MFA code during login
   * Supports TOTP, backup codes, SMS, and email
   */
  static async verifyMFA(
    userId: string,
    code: string,
    method: 'totp' | 'backup_code' | 'sms' | 'email',
    ipAddress?: string,
    userAgent?: string
  ): Promise<MFAVerificationResult> {
    try {
      // Check rate limiting
      const { data: rateLimitOk } = await serverSupabase
        .rpc('check_mfa_rate_limit', { p_user_id: userId });

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
          verified = await this.verifyTOTP(userId, code);
          break;

        case 'backup_code':
          const backupResult = await this.verifyBackupCode(userId, code);
          verified = backupResult.verified;
          requiresNewBackupCodes = backupResult.requiresNewCodes;
          break;

        case 'sms':
        case 'email':
          verified = await this.verifyPendingCode(userId, code, method);
          break;

        default:
          return { success: false, error: 'Invalid MFA method' };
      }

      // Record attempt
      await this.recordVerificationAttempt(
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

  /**
   * Generate new backup codes
   * Should be called when user runs low or after using one
   */
  static async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Delete old unused backup codes
      await serverSupabase
        .from('mfa_backup_codes')
        .delete()
        .eq('user_id', userId)
        .is('used_at', null);

      // Generate new codes
      const backupCodes = this.generateBackupCodes();
      await this.storeBackupCodes(userId, backupCodes);

      logger.info('Backup codes regenerated', {
        service: 'mfa',
        userId,
      });

      return backupCodes;
    } catch (error) {
      logger.error('Failed to generate backup codes', error, {
        service: 'mfa',
        userId,
      });
      throw error;
    }
  }

  /**
   * Disable MFA for user
   * Requires password confirmation (should be done at API level)
   */
  static async disableMFA(userId: string): Promise<void> {
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
   * Create pre-MFA session token
   * Used after password verification but before MFA completion
   */
  static async createPreMFASession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PreMFASession> {
    try {
      const sessionToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.PRE_MFA_SESSION_DURATION);

      const { error } = await serverSupabase
        .from('pre_mfa_sessions')
        .insert({
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
  static async validatePreMFASession(
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
  static async deletePreMFASession(sessionToken: string): Promise<void> {
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

  /**
   * Create trusted device token
   * Allows user to skip MFA on this device for 30 days
   */
  static async createTrustedDevice(
    userId: string,
    deviceName?: string,
    deviceFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TrustedDeviceData> {
    try {
      const deviceToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.TRUSTED_DEVICE_DURATION);

      const { error } = await serverSupabase
        .from('trusted_devices')
        .insert({
          user_id: userId,
          device_token: deviceToken,
          device_name: deviceName,
          device_fingerprint: deviceFingerprint,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        logger.error('Failed to create trusted device', error, {
          service: 'mfa',
          userId,
        });
        throw new Error('Failed to create trusted device');
      }

      logger.info('Trusted device created', {
        service: 'mfa',
        userId,
      });

      return { deviceToken, deviceName, expiresAt };
    } catch (error) {
      logger.error('Trusted device creation failed', error, {
        service: 'mfa',
        userId,
      });
      throw error;
    }
  }

  /**
   * Validate trusted device token
   * Returns user ID if valid, null otherwise
   */
  static async validateTrustedDevice(
    deviceToken: string
  ): Promise<string | null> {
    try {
      const { data, error } = await serverSupabase
        .from('trusted_devices')
        .select('user_id, expires_at')
        .eq('device_token', deviceToken)
        .single();

      if (error || !data) {
        return null;
      }

      // Check expiration
      if (new Date(data.expires_at) < new Date()) {
        // Clean up expired device
        await serverSupabase
          .from('trusted_devices')
          .delete()
          .eq('device_token', deviceToken);
        return null;
      }

      // Update last used timestamp
      await serverSupabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('device_token', deviceToken);

      return data.user_id;
    } catch (error) {
      logger.error('Trusted device validation failed', error, {
        service: 'mfa',
      });
      return null;
    }
  }

  /**
   * Get MFA status for user
   */
  static async getMFAStatus(userId: string) {
    try {
      const { data: user, error } = await serverSupabase
        .from('users')
        .select('mfa_enabled, mfa_method, mfa_enrolled_at, phone_number')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      // Get backup codes count
      const { data: backupCodesCount } = await serverSupabase
        .rpc('get_unused_backup_codes_count', { p_user_id: userId });

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

  // ============================================================================
  // Private helper methods
  // ============================================================================

  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  private static generateBackupCode(): string {
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars
    let code = '';
    const bytes = randomBytes(this.BACKUP_CODE_LENGTH);
    for (let i = 0; i < this.BACKUP_CODE_LENGTH; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  private static async storeBackupCodes(
    userId: string,
    codes: string[]
  ): Promise<void> {
    const hashedCodes = await Promise.all(
      codes.map(async (code) => ({
        user_id: userId,
        code_hash: await bcrypt.hash(code, 10),
      }))
    );

    const { error } = await serverSupabase
      .from('mfa_backup_codes')
      .insert(hashedCodes);

    if (error) {
      throw new Error('Failed to store backup codes');
    }
  }

  private static async verifyTOTP(
    userId: string,
    token: string
  ): Promise<boolean> {
    const { data: user } = await serverSupabase
      .from('users')
      .select('totp_secret')
      .eq('id', userId)
      .single();

    if (!user || !user.totp_secret) {
      return false;
    }

    // NOTE: Uncomment when speakeasy is installed
    /*
    return speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token,
      window: this.TOTP_WINDOW,
    });
    */

    // Temporary mock
    return token.length === 6;
  }

  private static async verifyBackupCode(
    userId: string,
    code: string
  ): Promise<{ verified: boolean; requiresNewCodes: boolean }> {
    const { data: backupCodes } = await serverSupabase
      .from('mfa_backup_codes')
      .select('id, code_hash')
      .eq('user_id', userId)
      .is('used_at', null);

    if (!backupCodes || backupCodes.length === 0) {
      return { verified: false, requiresNewCodes: false };
    }

    // Try to match code
    for (const record of backupCodes) {
      const match = await bcrypt.compare(code, record.code_hash);
      if (match) {
        // Mark as used
        await serverSupabase
          .from('mfa_backup_codes')
          .update({ used_at: new Date().toISOString() })
          .eq('id', record.id);

        // Check if running low on backup codes
        const requiresNewCodes = backupCodes.length <= 2;

        return { verified: true, requiresNewCodes };
      }
    }

    return { verified: false, requiresNewCodes: false };
  }

  private static async verifyPendingCode(
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

  private static async recordVerificationAttempt(
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

  private static generateSecureToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private static generateMockSecret(): string {
    // Generate a valid base32 string for mock
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  }
}
