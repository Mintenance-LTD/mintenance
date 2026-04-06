/**
 * MFA Service - Backup Code Generation (pure, no DB)
 *
 * Generates random backup codes using crypto.randomBytes. Does NOT
 * store, hash, or persist anything. Hashing/storage remains in
 * MFAService.storeBackupCodes.
 */

import { randomBytes } from 'crypto';
import { BACKUP_CODE_COUNT, BACKUP_CODE_LENGTH } from './constants';

/** Exclude visually ambiguous characters (0/O, 1/I, etc.) */
const BACKUP_CODE_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a single backup code of BACKUP_CODE_LENGTH characters using
 * cryptographically random bytes.
 */
export function generateBackupCode(): string {
  let code = '';
  const bytes = randomBytes(BACKUP_CODE_LENGTH);
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    code += BACKUP_CODE_ALPHABET[bytes[i] % BACKUP_CODE_ALPHABET.length];
  }
  return code;
}

/**
 * Generate an array of BACKUP_CODE_COUNT unique backup codes.
 */
export function createBackupCodeArray(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    codes.push(generateBackupCode());
  }
  return codes;
}
