/**
 * MFA Service - Secure Token Generation (pure)
 *
 * Generates cryptographically random tokens for pre-MFA sessions and
 * trusted devices. No storage or validation logic here.
 */

import { randomBytes } from 'crypto';

/**
 * Generate a URL-safe random token (256 bits, base64url-encoded).
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}
