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
 * Verify JWT token with runtime type validation
 * Prevents type safety violations by validating payload structure
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    // Runtime validation of payload structure
    // This prevents type safety violations and ensures data integrity
    if (
      !payload.sub ||
      typeof payload.sub !== 'string' ||
      typeof (payload as any).email !== 'string' ||
      typeof (payload as any).role !== 'string'
    ) {
      // Invalid payload structure - log warning but don't expose details
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JWT] Invalid payload structure detected', {
          hasSub: !!payload.sub,
          hasEmail: !!((payload as any).email),
          hasRole: !!((payload as any).role),
        });
      }
      return null;
    }

    // Validate role is one of the expected values
    const role = (payload as any).role;
    if (!['homeowner', 'contractor', 'admin'].includes(role)) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JWT] Invalid role in token:', role);
      }
      return null;
    }

    // Extract and validate optional fields
    const firstName = typeof (payload as any).first_name === 'string'
      ? (payload as any).first_name
      : undefined;
    const lastName = typeof (payload as any).last_name === 'string'
      ? (payload as any).last_name
      : undefined;

    // Build validated payload with proper typing
    return {
      sub: payload.sub,
      email: (payload as any).email,
      role: role,
      first_name: firstName,
      last_name: lastName,
      iat: payload.iat ?? Math.floor(Date.now() / 1000),
      exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600,
    };
  } catch (error) {
    // JWT verification failed - log error in development
    if (typeof console !== 'undefined' && console.error && process.env.NODE_ENV === 'development') {
      console.error('[JWT] Verification failed:', error instanceof Error ? error.message : String(error));
    }
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