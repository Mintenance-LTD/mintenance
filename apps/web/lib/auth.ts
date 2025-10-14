import { cookies } from 'next/headers';
import { DatabaseManager } from './database';
import { generateJWT, verifyJWT, generateTokenPair, hashRefreshToken, ConfigManager } from '@mintenance/auth';
import { serverSupabase } from './api/supabaseServer';
import { logger } from './logger';
import type { User, JWTPayload } from '@mintenance/types';

const config = ConfigManager.getInstance();

/**
 * Create a JWT token for a user
 */
export async function createToken(user: Pick<User, 'id' | 'email' | 'role'>): Promise<string> {
  const secret = config.getRequired('JWT_SECRET');
  return generateJWT(user, secret, '1h');
}

/**
 * Create token pair and store refresh token
 */
export async function createTokenPair(user: Pick<User, 'id' | 'email' | 'role'>, deviceInfo?: any, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = config.getRequired('JWT_SECRET');
  const { accessToken, refreshToken } = await generateTokenPair(user, secret);
  
  // Store refresh token in database
  const { error } = await serverSupabase
    .from('refresh_tokens')
    .insert({
      user_id: user.id,
      token_hash: hashRefreshToken(refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      device_info: deviceInfo,
      ip_address: ipAddress
    });

  if (error) {
    throw new Error('Failed to store refresh token');
  }

  return { accessToken, refreshToken };
}

/**
 * Rotate tokens (invalidate old refresh token, create new pair)
 */
export async function rotateTokens(userId: string, oldRefreshToken: string, deviceInfo?: any, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await DatabaseManager.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify and revoke old refresh token
  const tokenHash = hashRefreshToken(oldRefreshToken);
  const { data: tokenRecord, error: tokenError } = await serverSupabase
    .from('refresh_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .eq('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (tokenError || !tokenRecord) {
    throw new Error('Invalid refresh token');
  }

  // Revoke old token
  await serverSupabase
    .from('refresh_tokens')
    .update({ 
      revoked_at: new Date().toISOString(),
      revoked_reason: 'rotated'
    })
    .eq('id', tokenRecord.id);

  // Create new token pair
  return createTokenPair(user, deviceInfo, ipAddress);
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllTokens(userId: string): Promise<void> {
  await serverSupabase
    .from('refresh_tokens')
    .update({ 
      revoked_at: new Date().toISOString(),
      revoked_reason: 'logout_all'
    })
    .eq('user_id', userId)
    .is('revoked_at', null);
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
export async function setAuthCookie(token: string, rememberMe: boolean = false) {
  const cookieStore = await cookies();
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days if remember me, else 24 hours
  
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: config.isProduction(),
    sameSite: 'strict', // Always use strict for security
    maxAge,
    path: '/',
  });
  
  // Set refresh token cookie (separate from access token)
  if (rememberMe) {
    cookieStore.set('remember-me', 'true', {
      httpOnly: false, // Allow client-side access for UI
      secure: config.isProduction(),
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }
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
export async function getCurrentUserFromCookies(): Promise<Pick<User, 'id' | 'email' | 'role' | 'first_name' | 'last_name'> | null> {
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
      first_name: jwtPayload.first_name || '',
      last_name: jwtPayload.last_name || '',
    };
  } catch (error) {
    logger.error('Failed to get user from cookies', error);
    return null;
  }
}

/**
 * Get current user from available request context
 */
export async function getCurrentUser(): Promise<User | null> {
  const { headers } = await import('next/headers');
  const headersList = await headers();

  let userInfo = getCurrentUserFromHeaders(headersList);
  if (!userInfo) {
    userInfo = await getCurrentUserFromCookies();
  }

  if (!userInfo) {
    return null;
  }

  try {
    const dbUser = await DatabaseManager.getUserById(userInfo.id);
    if (dbUser) {
      return dbUser;
    }
  } catch (error) {
    logger.error('[Auth] Failed to load user from database', error);
  }

  return null;
}

