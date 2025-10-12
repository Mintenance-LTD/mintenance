import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import { randomBytes, createHash } from 'crypto';
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
  return randomBytes(32).toString('hex');
}

/**
 * Hash refresh token for storage
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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
    const { payload } = await jwtVerify(token, secretKey);

    return {
      sub: payload.sub!,
      email: (payload as any).email,
      role: (payload as any).role,
      iat: payload.iat!,
      exp: payload.exp!,
    } as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Decode JWT payload without verification (for inspection only)
 */
export function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Safe base64 decode
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    let decoded = '';

    const g: any = globalThis as any;
    if (typeof g.atob === 'function') {
      decoded = g.atob(base64Url);
    } else if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(base64Url, 'base64').toString('utf8');
    } else {
      return null;
    }

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}