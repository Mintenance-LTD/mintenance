/**
 * Multi-Factor Authentication (MFA) Service
 *
 * Thin facade that delegates to focused modules in ./service/.
 * All existing imports of `MFAService` from `@/lib/mfa/mfa-service` continue
 * to work unchanged.
 */

import {
  enrollTOTP,
  verifyTOTPEnrollment,
  verifyMFA,
} from './service/mfa-totp';
import { generateBackupCodes } from './service/mfa-recovery';
import {
  createTrustedDevice,
  validateTrustedDevice,
} from './service/mfa-trusted-devices';
import {
  createPreMFASession,
  validatePreMFASession,
  deletePreMFASession,
} from './service/mfa-sessions';
import { getMFAStatus, disableMFA } from './service/mfa-status';

import type {
  TOTPEnrollmentData,
  MFAVerificationResult,
  PreMFASession,
  TrustedDeviceData,
} from './service/types';

export type {
  TOTPEnrollmentData,
  MFAVerificationResult,
  PreMFASession,
  TrustedDeviceData,
};

export class MFAService {
  static enrollTOTP(userId: string): Promise<TOTPEnrollmentData> {
    return enrollTOTP(userId);
  }

  static verifyTOTPEnrollment(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    return verifyTOTPEnrollment(userId, token);
  }

  static verifyMFA(
    userId: string,
    code: string,
    method: 'totp' | 'backup_code' | 'sms' | 'email',
    ipAddress?: string,
    userAgent?: string
  ): Promise<MFAVerificationResult> {
    return verifyMFA(userId, code, method, ipAddress, userAgent);
  }

  static generateBackupCodes(userId: string): Promise<string[]> {
    return generateBackupCodes(userId);
  }

  static disableMFA(userId: string): Promise<void> {
    return disableMFA(userId);
  }

  static createPreMFASession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PreMFASession> {
    return createPreMFASession(userId, ipAddress, userAgent);
  }

  static validatePreMFASession(sessionToken: string): Promise<string | null> {
    return validatePreMFASession(sessionToken);
  }

  static deletePreMFASession(sessionToken: string): Promise<void> {
    return deletePreMFASession(sessionToken);
  }

  static createTrustedDevice(
    userId: string,
    deviceName?: string,
    deviceFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TrustedDeviceData> {
    return createTrustedDevice(
      userId,
      deviceName,
      deviceFingerprint,
      ipAddress,
      userAgent
    );
  }

  static validateTrustedDevice(
    deviceToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    return validateTrustedDevice(deviceToken, ipAddress, userAgent);
  }

  static getMFAStatus(userId: string) {
    return getMFAStatus(userId);
  }
}
