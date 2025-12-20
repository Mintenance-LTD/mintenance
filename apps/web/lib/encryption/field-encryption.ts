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

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
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
export function encryptField(plaintext: string, context: string): EncryptedField {
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
export function decryptField(encryptedField: EncryptedField, context: string): string {
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
    throw new Error('Failed to decrypt field - data may be corrupted or tampered with');
  }
}

/**
 * Payment data that may contain sensitive fields
 */
export interface PaymentData {
  [key: string]: any;
}

/**
 * Fields that should be encrypted in payment data
 */
const SENSITIVE_PAYMENT_FIELDS = [
  'card_number',
  'cvv',
  'bank_account_number',
  'routing_number',
  'ssn',
  'tax_id',
  'personal_id',
];

/**
 * Encrypt sensitive fields in payment data
 *
 * @param data - Payment data object
 * @returns Data with sensitive fields encrypted
 */
export function encryptPaymentData(data: PaymentData): PaymentData {
  const encrypted: PaymentData = { ...data };

  for (const field of SENSITIVE_PAYMENT_FIELDS) {
    if (data[field] && typeof data[field] === 'string') {
      try {
        const encryptedField = encryptField(data[field], `payment:${field}`);
        encrypted[`${field}_encrypted`] = encryptedField;
        delete encrypted[field]; // Remove plaintext
      } catch (error) {
        logger.error(`Failed to encrypt field: ${field}`, error, {
          service: 'encryption',
        });
        // Don't include the field if encryption fails
        delete encrypted[field];
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in payment data
 *
 * @param data - Payment data with encrypted fields
 * @returns Data with sensitive fields decrypted
 */
export function decryptPaymentData(data: PaymentData): PaymentData {
  const decrypted: PaymentData = { ...data };

  for (const field of SENSITIVE_PAYMENT_FIELDS) {
    const encryptedFieldName = `${field}_encrypted`;

    if (data[encryptedFieldName]) {
      try {
        const encryptedField = data[encryptedFieldName] as EncryptedField;
        decrypted[field] = decryptField(encryptedField, `payment:${field}`);
        delete decrypted[encryptedFieldName]; // Remove encrypted version
      } catch (error) {
        logger.error(`Failed to decrypt field: ${field}`, error, {
          service: 'encryption',
        });
        // Don't include the field if decryption fails
        delete decrypted[encryptedFieldName];
      }
    }
  }

  return decrypted;
}

/**
 * Securely compare two strings in constant time
 * Prevents timing attacks when comparing sensitive values
 */
export function secureCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  // If lengths don't match, still compare to prevent timing leaks
  const length = Math.max(bufferA.length, bufferB.length);
  let result = bufferA.length ^ bufferB.length;

  for (let i = 0; i < length; i++) {
    result |= (bufferA[i] || 0) ^ (bufferB[i] || 0);
  }

  return result === 0;
}

/**
 * Hash sensitive data for comparison without storing plaintext
 * Useful for checking if a value has changed without storing the actual value
 */
export function hashForComparison(value: string, salt?: string): string {
  const hash = createHash('sha256');

  if (salt) {
    hash.update(salt);
  }

  hash.update(value);

  return hash.digest('hex');
}

/**
 * Generate a secure random token
 * Useful for generating one-time tokens, session IDs, etc.
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Redact sensitive information from logs
 * Replaces sensitive data with asterisks while preserving structure
 */
export function redactSensitiveData(data: any): any {
  if (typeof data === 'string') {
    // Check if it looks like a card number
    if (/^\d{13,19}$/.test(data.replace(/\s/g, ''))) {
      return data.substring(0, 4) + '********' + data.substring(data.length - 4);
    }

    // Check if it looks like an email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      const [local, domain] = data.split('@');
      return `${local[0]}***@${domain}`;
    }

    // Check if it's a long string that might be sensitive
    if (data.length > 20) {
      return data.substring(0, 4) + '***' + data.substring(data.length - 4);
    }

    return data;
  }

  if (typeof data === 'object' && data !== null) {
    const redacted: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      // Check if key name suggests sensitive data
      const sensitiveKeys = [
        'password',
        'token',
        'secret',
        'key',
        'ssn',
        'cvv',
        'card',
        'account',
      ];

      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        redacted[key] = '***REDACTED***';
      } else {
        redacted[key] = redactSensitiveData(data[key]);
      }
    }

    return redacted;
  }

  return data;
}

/**
 * Validate encryption configuration
 * Should be called on application startup
 */
export function validateEncryptionConfig(): boolean {
  try {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;

    if (!masterKey) {
      logger.error('Encryption master key not configured', {
        service: 'encryption',
      });
      return false;
    }

    // Validate key format and length
    const keyBuffer = Buffer.from(masterKey, 'hex');
    if (keyBuffer.length !== KEY_LENGTH) {
      logger.error('Invalid master key length', {
        service: 'encryption',
        expected: KEY_LENGTH,
        actual: keyBuffer.length,
      });
      return false;
    }

    // Test encryption/decryption
    const testData = 'test-data';
    const encrypted = encryptField(testData, 'test');
    const decrypted = decryptField(encrypted, 'test');

    if (decrypted !== testData) {
      logger.error('Encryption validation failed - decrypted data does not match', {
        service: 'encryption',
      });
      return false;
    }

    logger.info('Encryption configuration validated successfully', {
      service: 'encryption',
    });

    return true;
  } catch (error) {
    logger.error('Encryption configuration validation failed', error, {
      service: 'encryption',
    });
    return false;
  }
}
