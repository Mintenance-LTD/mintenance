import { supabase } from '../../config/supabase';

/**
 * JWT validation + safe payload decoding extracted from
 * `services/AuthService.ts` on 2026-05-09.
 *
 * `validateToken` uses Supabase's built-in verification (which checks
 * signature against the issuer's JWKS) plus a belt-and-braces
 * expiry / issuer check on the decoded payload. `decodeJWTPayload`
 * is signature-agnostic — only used by callers that already validated
 * via Supabase.
 */

export interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  error?: string;
  errorType?: 'expired' | 'invalid' | 'missing' | 'unknown';
  expiresAt?: number;
}

export interface JWTPayload {
  exp?: number;
  iss?: string;
  sub?: string;
  [key: string]: unknown;
}

export async function validateToken(
  token: string
): Promise<TokenValidationResult> {
  try {
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const { data: user, error } = await supabase.auth.getUser(token);
    if (error) {
      return { valid: false, error: error.message };
    }
    if (!user?.user) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const payload = decodeJWTPayload(token);
    if (!payload) {
      return { valid: false, error: 'Cannot decode token payload' };
    }

    if (payload.exp && Number(payload.exp) < Date.now() / 1000) {
      return { valid: false, error: 'Token expired' };
    }

    if (payload.iss && !payload.iss.includes('supabase')) {
      return { valid: false, error: 'Invalid token issuer' };
    }

    return { valid: true, userId: user.user.id };
  } catch {
    return { valid: false, error: 'Token validation failed' };
  }
}

export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    let decoded = '';

    interface GlobalWithAtob {
      atob?: (data: string) => string;
    }
    const g = globalThis as GlobalWithAtob;
    if (typeof g.atob === 'function') {
      decoded = g.atob(base64Url);
    } else if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(base64Url, 'base64').toString('utf8');
    } else {
      return null;
    }

    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
}
