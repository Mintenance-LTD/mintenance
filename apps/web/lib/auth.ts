import { cookies } from 'next/headers';
import { DatabaseManager } from './database';
import { generateJWT, verifyJWT, generateTokenPair, hashRefreshToken, ConfigManager } from '@mintenance/auth';
import { serverSupabase } from './api/supabaseServer';
import { logger } from './logger';
import type { User, JWTPayload } from '@mintenance/types';

// Initialize config manager
const config = ConfigManager.getInstance();


// Centralized cookie names and TTLs
// Use __Host- prefix in production for additional security, regular names in development
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_PREFIX = isProduction ? '__Host-' : '';

const AUTH_COOKIE = `${COOKIE_PREFIX}mintenance-auth`;
const REFRESH_COOKIE = `${COOKIE_PREFIX}mintenance-refresh`;
const REMEMBER_COOKIE = `${COOKIE_PREFIX}mintenance-remember`;

// TTL constants (in seconds)
const ACCESS_TTL_SEC = 3600; // 1 hour
const REFRESH_TTL_SEC_SHORT = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TTL_SEC_LONG = 30 * 24 * 60 * 60; // 30 days

// Device information interface
interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

// Supabase RPC result interface for rotate_refresh_token
interface RotateRefreshTokenResult {
  user_email: string;
  user_role: string;
  family_id?: string;
  next_generation?: number;
}
/**
 * Create a JWT token for a user
 */
export async function createToken(user: Pick<User, 'id' | 'email' | 'role'>): Promise<string> {
  const secret = config.getRequired('JWT_SECRET');
  return generateJWT(user, secret, '1h');
}

/**
 * Create token pair and store refresh token
 * Supports token family tracking for breach detection
 */
export async function createTokenPair(
  user: Pick<User, 'id' | 'email' | 'role'>,
  deviceInfo?: DeviceInfo,
  ipAddress?: string,
  familyId?: string,
  generation?: number
): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = config.getRequired('JWT_SECRET');
  const { accessToken, refreshToken } = await generateTokenPair(user, secret);

  // Store refresh token in database with family tracking
  const insertData: any = {
    user_id: user.id,
    token_hash: hashRefreshToken(refreshToken),
    expires_at: new Date(Date.now() + REFRESH_TTL_SEC_SHORT * 1000).toISOString(), // 7 days
    device_info: deviceInfo,
    ip_address: ipAddress,
  };

  // If family_id provided, this is a rotation - preserve the family
  if (familyId) {
    insertData.family_id = familyId;
  }

  // If generation provided, use it (for rotations)
  if (generation !== undefined) {
    insertData.generation = generation;
  }

  const { error } = await serverSupabase
    .from('refresh_tokens')
    .insert(insertData);

  if (error) {
    logger.error('Failed to store refresh token', error, {
      service: 'auth',
      userId: user.id,
      hasFamily: !!familyId,
    });
    throw new Error('Failed to store refresh token');
  }

  return { accessToken, refreshToken };
}

/**
 * Rotate tokens (invalidate old refresh token, create new pair)
 * Uses atomic PostgreSQL function to prevent race conditions
 */
export async function rotateTokens(userId: string, oldRefreshToken: string, deviceInfo?: DeviceInfo, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = hashRefreshToken(oldRefreshToken);

  // Use PostgreSQL function for atomic token rotation with row-level locking
  // This prevents race conditions when concurrent requests try to rotate the same token
  const { data: result, error } = await serverSupabase
    .rpc('rotate_refresh_token', {
      p_user_id: userId,
      p_token_hash: tokenHash,
    })
    .single() as { data: RotateRefreshTokenResult | null; error: any };

  if (error) {
    logger.error('Token rotation failed', error, {
      service: 'auth',
      userId,
      errorCode: error.code,
      errorMessage: error.message,
    });
    throw new Error('Token rotation failed: ' + (error.message || 'Invalid or already rotated token'));
  }

  if (!result || !result.user_email || !result.user_role) {
    logger.error('Token rotation returned invalid data', null, {
      service: 'auth',
      userId,
      hasResult: !!result,
    });
    throw new Error('Token rotation failed: Invalid response from database');
  }

  // Create new token pair with user details and family tracking
  const user = {
    id: userId,
    email: result.user_email,
    role: result.user_role as 'homeowner' | 'contractor' | 'admin',
  };

  // Preserve family_id and increment generation for breach detection
  return createTokenPair(
    user,
    deviceInfo,
    ipAddress,
    result.family_id, // Preserve family across rotations
    result.next_generation // Increment generation
  );
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
 * Create Set-Cookie headers for authentication (use in API routes)
 */
export function createAuthCookieHeaders(token: string, rememberMe: boolean = false, refreshToken?: string): Headers {
  const headers = new Headers();
  const accessTokenMaxAge = ACCESS_TTL_SEC; // 1 hour
  const refreshTokenMaxAge = rememberMe ? REFRESH_TTL_SEC_LONG : REFRESH_TTL_SEC_SHORT; // 30 days if remember me, else 7 days
  const isProduction = config.isProduction();

  // Set access token (short-lived)
  headers.append('Set-Cookie', `${AUTH_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${accessTokenMaxAge}; SameSite=Strict${isProduction ? '; Secure' : ''}`);

  // Set refresh token (long-lived, HTTP-only for security)
  if (refreshToken) {
    headers.append('Set-Cookie', `${REFRESH_COOKIE}=${refreshToken}; HttpOnly; Path=/; Max-Age=${refreshTokenMaxAge}; SameSite=Strict${isProduction ? '; Secure' : ''}`);
  }

  // Set remember-me flag for UI (non-sensitive)
  if (rememberMe) {
    headers.append('Set-Cookie', `${REMEMBER_COOKIE}=true; Path=/; Max-Age=${refreshTokenMaxAge}; SameSite=Strict${isProduction ? '; Secure' : ''}`);
  }

  return headers;
}

/**
 * Set authentication cookies (access token + refresh token) - use in Server Components
 */
export async function setAuthCookie(token: string, rememberMe: boolean = false, refreshToken?: string) {
  const cookieStore = await cookies();
  const accessTokenMaxAge = ACCESS_TTL_SEC; // 1 hour
  const refreshTokenMaxAge = rememberMe ? REFRESH_TTL_SEC_LONG : REFRESH_TTL_SEC_SHORT; // 30 days if remember me, else 7 days

  // Set access token (short-lived)
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction(),
    sameSite: 'strict',
    maxAge: accessTokenMaxAge,
    path: '/',
  });

  // Set refresh token (long-lived, HTTP-only for security)
  if (refreshToken) {
    cookieStore.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true, // SECURITY: Never expose refresh token to JavaScript
      secure: config.isProduction(),
      sameSite: 'strict',
      maxAge: refreshTokenMaxAge,
      path: '/',
    });
  }

  // Set remember-me flag for UI (non-sensitive)
  if (rememberMe) {
    cookieStore.set(REMEMBER_COOKIE, 'true', {
      httpOnly: false, // Allow client-side access for UI
      secure: config.isProduction(),
      sameSite: 'strict',
      maxAge: refreshTokenMaxAge,
      path: '/',
    });
  }
}

/**
 * Clear all authentication cookies
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(REMEMBER_COOKIE);
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
    const token = cookieStore.get(AUTH_COOKIE)?.value;

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

