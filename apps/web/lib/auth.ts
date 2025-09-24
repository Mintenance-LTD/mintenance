import { cookies } from 'next/headers';
import { generateJWT, verifyJWT, ConfigManager } from '@mintenance/auth';
import type { User, JWTPayload } from '@mintenance/types';

const config = ConfigManager.getInstance();

/**
 * Create a JWT token for a user
 */
export async function createToken(user: Pick<User, 'id' | 'email' | 'role'>): Promise<string> {
  const secret = config.getRequired('JWT_SECRET');
  return generateJWT(user, secret, '24h');
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  const secret = config.getRequired('JWT_SECRET');
  return verifyJWT(token, secret);
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: config.isProduction(),
    sameSite: config.isProduction() ? 'strict' : 'lax', // Stricter in production
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
export function getCurrentUserFromHeaders(headers: Headers): Pick<User, 'id' | 'email' | 'role'> | null {
  const userId = headers.get('x-user-id');
  const userEmail = headers.get('x-user-email');
  const userRole = headers.get('x-user-role');

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  // Validate role is a valid user role
  if (!['homeowner', 'contractor', 'admin'].includes(userRole)) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    role: userRole as 'homeowner' | 'contractor' | 'admin',
  };
}

/**
 * Get current user directly from cookies (more reliable for server components)
 * This is an alternative to header-based user propagation
 */
export async function getCurrentUserFromCookies(): Promise<Pick<User, 'id' | 'email' | 'role'> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const jwtPayload = await verifyToken(token);

    if (!jwtPayload || !jwtPayload.sub || !jwtPayload.email || !jwtPayload.role) {
      return null;
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp && jwtPayload.exp < now) {
      return null;
    }

    // Validate role is a valid user role
    if (!['homeowner', 'contractor', 'admin'].includes(jwtPayload.role)) {
      return null;
    }

    return {
      id: jwtPayload.sub,
      email: jwtPayload.email,
      role: jwtPayload.role as 'homeowner' | 'contractor' | 'admin',
    };
  } catch (error) {
    console.error('Failed to get user from cookies:', error);
    return null;
  }
}
