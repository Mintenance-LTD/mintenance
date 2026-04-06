/**
 * MFA Service - Type Definitions
 *
 * Pure type declarations extracted from mfa-service.ts.
 * No runtime behavior.
 */

export interface TOTPEnrollmentData {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  success: boolean;
  error?: string;
  requiresNewBackupCodes?: boolean;
}

export interface PreMFASession {
  sessionToken: string;
  expiresAt: Date;
}

export interface TrustedDeviceData {
  deviceToken: string;
  deviceName?: string;
  expiresAt: Date;
}
