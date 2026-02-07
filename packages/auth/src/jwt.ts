import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
// Define our JWT payload interface
interface JosePayload extends JoseJWTPayload {
  email: string;
  role: string;
}
/** Minimal crypto interface for refresh token (Node.js only) */
interface CryptoLike {
  randomBytes(size: number): { toString(encoding: 'hex'): string };
  createHash(algorithm: string): { update(data: string): { digest(encoding: 'hex'): string } };
}

let cryptoPromise: Promise<CryptoLike> | null = null;
const getCrypto = async (): Promise<CryptoLike> => {
  if (cryptoPromise) {
    return cryptoPromise;
  }
  if (typeof window !== 'undefined' || typeof process === 'undefined') {
    throw new Error('Refresh token generation not available in Edge Runtime');
  }
  cryptoPromise = import('crypto').then((module) => module as unknown as CryptoLike);
  return cryptoPromise;
};
import type { JWTPayload } from '@mintenance/types';
/**
 * Generate JWT token
 *
 * VULN-009: Added session timestamp tracking for absolute/idle timeout enforcement
 *
 * @param sessionStart - Unix timestamp (ms) of original login (preserved across refreshes)
 * @param lastActivity - Unix timestamp (ms) of last user activity (updated on refreshes)
 */
export async function generateJWT(
  payload: {
    id: string;
    email: string;
    role: string;
  },
  secret: string,
  expiresIn: string = '1h',
  sessionStart?: number,
  lastActivity?: number
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const token = await new SignJWT({
    sub: payload.id,
    email: payload.email,
    role: payload.role,
    type: 'access',
    // VULN-009: Add session tracking fields
    ...(sessionStart && { sessionStart }),
    ...(lastActivity && { lastActivity }),
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
export async function generateRefreshToken(): Promise<string> {
  const crypto = await getCrypto();
  return crypto.randomBytes(32).toString('hex');
}
/**
 * Hash refresh token for storage
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const crypto = await getCrypto();
  return crypto.createHash('sha256').update(token).digest('hex');
}
/**
 * Generate token pair (access + refresh)
 *
 * VULN-009: Added session timestamp tracking
 */
export async function generateTokenPair(
  payload: {
    id: string;
    email: string;
    role: string;
  },
  secret: string,
  sessionStart?: number,
  lastActivity?: number
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await generateJWT(payload, secret, '1h', sessionStart, lastActivity);
  const refreshToken = await generateRefreshToken();
  return { accessToken, refreshToken };
}
/**
 * Verify JWT token
 *
 * VULN-009: Returns session tracking fields if present
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify<JosePayload & { sessionStart?: number; lastActivity?: number }>(token, secretKey);
    return {
      sub: payload.sub!,
      email: payload.email,
      role: payload.role,
      iat: payload.iat!,
      exp: payload.exp!,
      // VULN-009: Include session tracking fields if present
      ...(payload.sessionStart && { sessionStart: payload.sessionStart }),
      ...(payload.lastActivity && { lastActivity: payload.lastActivity }),
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
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;

    const payload = parsed as Record<string, unknown>;
    const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const role = typeof payload.role === 'string' ? payload.role : undefined;
    const iat = typeof payload.iat === 'number' ? payload.iat : undefined;
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined;

    if (!sub || !email || !role || !iat || !exp) return null;

    return {
      sub,
      email,
      role,
      iat,
      exp,
      first_name: typeof payload.first_name === 'string' ? payload.first_name : undefined,
      last_name: typeof payload.last_name === 'string' ? payload.last_name : undefined,
      sessionStart: typeof payload.sessionStart === 'number' ? payload.sessionStart : undefined,
      lastActivity: typeof payload.lastActivity === 'number' ? payload.lastActivity : undefined,
    };
  } catch {
    return null;
  }
}