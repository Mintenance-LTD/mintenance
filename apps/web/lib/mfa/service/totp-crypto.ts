/**
 * MFA Service - TOTP Secret Decryption Helper
 *
 * Pure helper function extracted from mfa-service.ts.
 * No DB access; no secret storage. Only decodes a stored value.
 */

import {
  decryptField,
  type EncryptedField,
} from '@/lib/encryption/field-encryption';

/**
 * Decrypt TOTP secret — handles AES-256-GCM encrypted (JSON envelope) and
 * legacy plaintext values for backward-compatibility during migration.
 */
export function tryDecryptTOTPSecret(rawValue: string): string {
  try {
    const parsed = JSON.parse(rawValue) as Partial<EncryptedField>;
    if (parsed.ciphertext && parsed.iv && parsed.authTag && parsed.algorithm) {
      return decryptField(parsed as EncryptedField, 'totp_secret');
    }
  } catch {
    // Not JSON — assume plaintext legacy value
  }
  return rawValue;
}
