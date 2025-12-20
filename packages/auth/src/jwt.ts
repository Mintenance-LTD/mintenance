import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';

// Define our JWT payload interface
interface JosePayload extends JoseJWTPayload {
  email: string;
  role: string;
}
// Conditional import for crypto (Node.js only, not Edge Runtime compatible)
let crypto: any = null;
try {
  // Check if we're in a Node.js environment
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    crypto = require('crypto');
  }
} catch {
  // crypto not available in Edge Runtime or other environments
}
import type { JWTPayload } from '@mintenance/types';

/**
 * Generate JWT token
 */
export async function generateJWT(payload: {
  id: string;
  email: string;
  role: string;
}, secret: string, expiresIn: string = '1h'): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  const token = await new SignJWT({
    sub: payload.id,
    email: payload.email,
    role: payload.role,
    type: 'access'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);

  return token;
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(): string {
  if (!crypto) {
    throw new Error('Refresh token generation not available in Edge Runtime');
  }
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash refresh token for storage
 */
export function hashRefreshToken(token: string): string {
  if (!crypto) {
    throw new Error('Refresh token hashing not available in Edge Runtime');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(payload: {
  id: string;
  email: string;
  role: string;
}, secret: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await generateJWT(payload, secret, '1h');
  const refreshToken = generateRefreshToken();
  
  return { accessToken, refreshToken };
}

/**
 * Verify JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify<JosePayload>(token, secretKey);

    return {
      sub: payload.sub!,
      email: payload.email,
      role: payload.role,
      iat: payload.iat!,
      exp: payload.exp!,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Decode JWT payload without verification (for inspection only)
 * WARNING: This does NOT verify the token signature. Use verifyJWT for authentication.
 */
export function decodeJWTPayload(token: string): Partial<JWTPayload> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Safe base64 decode
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    let decoded = '';

    // Type-safe global access
    const g = globalThis as typeof globalThis & { atob?: (data: string) => string };
    if (typeof g.atob === 'function') {
      decoded = g.atob(base64Url);
    } else if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(base64Url, 'base64').toString('utf8');
    } else {
      return null;
    }

    const parsed = JSON.parse(decoded);
    // Return as Partial since unverified payload may be incomplete
    return parsed as Partial<JWTPayload>;
  } catch {
    return null;
  }
}