import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { config, getJWTSecret, isProduction } from './config';

const JWT_SECRET = new TextEncoder().encode(getJWTSecret());

export interface User {
  id: string;
  email: string;
  role: string;
}

/**
 * Create a JWT token for a user
 */
export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({ 
    sub: user.id,
    email: user.email,
    role: user.role 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      sub: string;
      email: string;
      role: string;
      iat: number;
      exp: number;
    };
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax', // Stricter in production
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

/**
 * Get current user from request headers (set by middleware)
 */
export function getCurrentUserFromHeaders(headers: Headers): User | null {
  const userId = headers.get('x-user-id');
  const userEmail = headers.get('x-user-email');
  const userRole = headers.get('x-user-role');

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    role: userRole,
  };
}
