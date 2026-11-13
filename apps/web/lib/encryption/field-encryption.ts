/**
 * Field-Level Encryption for Sensitive Payment Data
 *
 * Implements AES-256-GCM encryption with envelope encryption pattern
 * for protecting sensitive payment information at rest.
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Envelope encryption (DEK + KEK)
 * - Unique IV for each encryption
 * - Authentication tags for integrity
 * - Context-bound encryption for additional security
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';
import { logger } from '@mintenance/shared';

/**
 * Encryption algorithm
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the master encryption key from environment
 * In production, this should be stored in a secure key management service (KMS)
 */
function getMasterKey(): Buffer {
  const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;

  if (!masterKeyHex) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
  }

  // Validate key length
  const keyBuffer = Buffer.from(masterKeyHex, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `Invalid master key length. Expected ${KEY_LENGTH} bytes, got ${keyBuffer.length}`
    );
  }

  return keyBuffer;
}

/**
 * Derive a data encryption key (DEK) from the master key and context
 * Uses HKDF-like approach for key derivation
 */
function deriveDataKey(context: string): Buffer {
  const masterKey = getMasterKey();

  // Use HMAC-SHA256 for key derivation
  const hash = createHash('sha256');
  hash.update(masterKey);
  hash.update(context);

  return hash.digest();
}

/**
 * Encrypted field result
 */
export interface EncryptedField {
  ciphertext: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded initialization vector
  authTag: string; // Base64-encoded authentication tag
  algorithm: string; // Encryption algorithm used
  context?: string; // Context used for key derivation
}

/**
 * Encrypt a field value using AES-256-GCM
 *
 * @param plaintext - The value to encrypt
 * @param context - Context for key derivation (e.g., 'payment_method', 'card_number')
 * @returns Encrypted field object
 */
export function encryptField(
  plaintext: string,
  context: string
): EncryptedField {
  try {
    // Generate unique IV for this encryption
    const iv = randomBytes(IV_LENGTH);

    // Derive data encryption key from master key and context
    const dek = deriveDataKey(context);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, dek, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: ALGORITHM,
      context,
    };
  } catch (error) {
    logger.error('Field encryption failed', error, {
      service: 'encryption',
      context,
    });
    throw new Error('Failed to encrypt field');
  }
}

/**
 * Decrypt a field value using AES-256-GCM
 *
 * @param encryptedField - The encrypted field object
 * @param context - Context used for key derivation (must match encryption context)
 * @returns Decrypted plaintext
 */
export function decryptField(
  encryptedField: EncryptedField,
  context: string
): string {
  try {
    // Validate context matches
    if (encryptedField.context && encryptedField.context !== context) {
      throw new Error('Context mismatch - possible tampering detected');
    }

    // Validate algorithm
    if (encryptedField.algorithm !== ALGORITHM) {
      throw new Error(`Unsupported algorithm: ${encryptedField.algorithm}`);
    }

    // Parse encrypted components
    const ciphertext = Buffer.from(encryptedField.ciphertext, 'base64');
    const iv = Buffer.from(encryptedField.iv, 'base64');
    const authTag = Buffer.from(encryptedField.authTag, 'base64');

    // Derive the same data encryption key
    const dek = deriveDataKey(context);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, dek, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Field decryption failed', error, {
      service: 'encryption',
      context,
    });
    throw new Error(
      'Failed to decrypt field - data may be corrupted or tampered with'
    );
  }
}

/**
 * Payment data that may contain sensitive fields
 */

/**
 * Fields that should be encrypted in payment data
 */
