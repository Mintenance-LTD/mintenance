/**
 * Web Platform Authentication Adapter
 * Handles cookie-based sessions, server-side token storage, and Redis blacklist
 */
import { UnifiedAuthService, AuthConfig, AuthTokens } from '../core/UnifiedAuthService';
import { logger } from '@mintenance/shared';
import { Redis } from '@upstash/redis';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
export interface WebAuthConfig extends AuthConfig {
  redisUrl?: string;
  redisToken?: string;
  cookieDomain?: string;
  cookieSecure?: boolean;
  cookieSameSite?: 'lax' | 'strict' | 'none';
  useHostPrefix?: boolean; // Use __Host- prefix in production
}
export interface StoredRefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  generation: number;
  expires_at: Date;
  consumed_at?: Date;
  revoked_at?: Date;
  revoked_reason?: string;
  device_info?: string;
  ip_address?: string;
  created_at: Date;
}
export class WebAuthAdapter extends UnifiedAuthService {
  private redis?: Redis;
  private tokenBlacklist: Map<string, Date> = new Map(); // Fallback for Redis
  private webConfig: WebAuthConfig;
  constructor(config: WebAuthConfig) {
    super({ ...config, platform: 'web' });
    this.webConfig = config;
    // Initialize Redis if configured
    if (config.redisUrl && config.redisToken) {
      try {
        this.redis = new Redis({
          url: config.redisUrl,
          token: config.redisToken,
        });
      } catch (error) {
        logger.error('Failed to initialize Redis:', error);
        // Fall back to in-memory blacklist
      }
    }
  }
  /**
   * Set authentication cookies after successful auth
   */
  async setAuthCookies(tokens: AuthTokens, request?: NextRequest): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieStore = cookies();
    // Cookie options
    const baseOptions = {
      httpOnly: true,
      secure: this.webConfig.cookieSecure ?? isProduction,
      sameSite: this.webConfig.cookieSameSite ?? 'lax' as const,
      domain: this.webConfig.cookieDomain,
      path: '/',
    };
    // Access token cookie (short-lived)
    const accessCookieName = isProduction && this.webConfig.useHostPrefix
      ? '__Host-access-token'
      : 'access-token';
    (await cookieStore).set(accessCookieName, tokens.accessToken, {
      ...baseOptions,
      maxAge: 60 * 60, // 1 hour
      expires: new Date(tokens.expiresAt),
    });
    // Refresh token cookie (long-lived)
    const refreshCookieName = isProduction && this.webConfig.useHostPrefix
      ? '__Host-refresh-token'
      : 'refresh-token';
    (await cookieStore).set(refreshCookieName, tokens.refreshToken, {
      ...baseOptions,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // CSRF token for double-submit cookie pattern
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const csrfCookieName = isProduction && this.webConfig.useHostPrefix
      ? '__Host-csrf-token'
      : 'csrf-token';
    (await cookieStore).set(csrfCookieName, csrfToken, {
      ...baseOptions,
      httpOnly: false, // Must be readable by JavaScript
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  /**
   * Clear authentication cookies on sign out
   */
  async clearAuthCookies(): Promise<void> {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieNames = isProduction && this.webConfig.useHostPrefix
      ? ['__Host-access-token', '__Host-refresh-token', '__Host-csrf-token']
      : ['access-token', 'refresh-token', 'csrf-token'];
    cookieNames.forEach(name => {
      cookieStore.set(name, '', {
        maxAge: 0,
        expires: new Date(0),
      });
    });
  }
  /**
   * Get tokens from cookies
   */
  async getTokensFromCookies(): Promise<{ accessToken?: string; refreshToken?: string }> {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const accessCookieName = isProduction && this.webConfig.useHostPrefix
      ? '__Host-access-token'
      : 'access-token';
    const refreshCookieName = isProduction && this.webConfig.useHostPrefix
      ? '__Host-refresh-token'
      : 'refresh-token';
    return {
      accessToken: cookieStore.get(accessCookieName)?.value,
      refreshToken: cookieStore.get(refreshCookieName)?.value,
    };
  }
  /**
   * Store refresh token in database with family tracking
   */
  async storeRefreshTokenWithFamily(
    token: string,
    userId: string,
    familyId?: string,
    generation: number = 0
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const newFamilyId = familyId || crypto.randomUUID();
    // Store in database (using Supabase client inherited from parent)
    const { error } = await this.supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        family_id: newFamilyId,
        generation,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        device_info: this.getDeviceInfo(),
        ip_address: this.getClientIP(),
      });
    if (error) {
      throw new Error(`Failed to store refresh token: ${error.message}`);
    }
  }
  /**
   * Validate refresh token and check for breaches
   */
  async validateAndRotateRefreshToken(token: string): Promise<AuthTokens | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    // Get token from database
    const { data: tokenData, error } = await this.supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();
    if (error || !tokenData) {
      return null;
    }
    const storedToken = tokenData as StoredRefreshToken;
    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      return null;
    }
    // Check if token has been revoked
    if (storedToken.revoked_at) {
      return null;
    }
    // BREACH DETECTION: Check if token has already been consumed
    if (storedToken.consumed_at) {
      // Token reuse detected! Invalidate entire family
      await this.invalidateTokenFamily(storedToken.family_id, 'token_reuse_detected');
      // Log security event
      logger.error('[SECURITY ALERT] Token reuse detected', {
        userId: storedToken.user_id,
        familyId: storedToken.family_id,
        generation: storedToken.generation,
      });
      return null;
    }
    // Mark token as consumed (atomic operation)
    await this.supabase
      .from('refresh_tokens')
      .update({ consumed_at: new Date() })
      .eq('token_hash', tokenHash);
    // Generate new token pair
    const { data: userData } = await this.supabase.auth.admin.getUserById(storedToken.user_id);
    if (!userData?.user) {
      return null;
    }
    const newTokens = await super.refreshAccessToken(token);
    // Store new refresh token in same family with incremented generation
    await this.storeRefreshTokenWithFamily(
      newTokens.refreshToken,
      storedToken.user_id,
      storedToken.family_id,
      storedToken.generation + 1
    );
    return newTokens;
  }
  /**
   * Invalidate entire token family (breach response)
   */
  async invalidateTokenFamily(familyId: string, reason: string): Promise<void> {
    const { error } = await this.supabase
      .from('refresh_tokens')
      .update({
        revoked_at: new Date(),
        revoked_reason: reason,
      })
      .eq('family_id', familyId)
      .is('revoked_at', null);
    if (error) {
      logger.error('Failed to invalidate token family:', error);
    }
    // Also add to blacklist for immediate effect
    if (this.redis) {
      try {
        await this.redis.set(`blacklist:family:${familyId}`, reason, {
          ex: 60 * 60 * 24 * 7, // 7 days
        });
      } catch {
        // Fallback to in-memory
        this.tokenBlacklist.set(familyId, new Date());
      }
    } else {
      this.tokenBlacklist.set(familyId, new Date());
    }
  }
  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    // Extract JTI from token (without verifying signature for performance)
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Invalid format
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const jti = payload.jti;
      if (!jti) return false; // No JTI to check
      // Check Redis blacklist
      if (this.redis) {
        try {
          const blacklisted = await this.redis.exists(`blacklist:token:${jti}`);
          return blacklisted === 1;
        } catch {
          // Fallback to in-memory
          return this.tokenBlacklist.has(jti);
        }
      }
      // Check in-memory blacklist
      return this.tokenBlacklist.has(jti);
    } catch {
      return false; // Error parsing token, let validation handle it
    }
  }
  /**
   * Add token to blacklist
   */
  async blacklistToken(token: string, reason: string): Promise<void> {
    const parts = token.split('.');
    if (parts.length !== 3) return;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const jti = payload.jti;
      const exp = payload.exp;
      if (!jti) return;
      // Calculate TTL based on token expiration
      const ttl = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 3600;
      // Add to Redis blacklist
      if (this.redis) {
        try {
          await this.redis.set(`blacklist:token:${jti}`, reason, { ex: ttl });
        } catch {
          // Fallback to in-memory
          this.tokenBlacklist.set(jti, new Date());
        }
      } else {
        this.tokenBlacklist.set(jti, new Date());
      }
    } catch {
      // Error parsing token
    }
  }
  /**
   * Verify CSRF token
   */
  verifyCSRFToken(request: NextRequest): boolean {
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const headerToken = request.headers.get('x-csrf-token');
    if (!cookieToken || !headerToken) {
      return false;
    }
    // Double-submit cookie pattern validation
    return cookieToken === headerToken;
  }
  /**
   * Get device information from request
   */
  private getDeviceInfo(): string {
    // This would typically parse User-Agent
    // Simplified for now
    return 'web-browser';
  }
  /**
   * Get client IP address
   */
  private getClientIP(): string {
    // This would typically get from request headers
    // Simplified for now
    return '0.0.0.0';
  }
  /**
   * Clean up expired tokens from in-memory blacklist
   */
  private cleanupBlacklist(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    for (const [key, timestamp] of this.tokenBlacklist.entries()) {
      if (timestamp.getTime() < oneHourAgo) {
        this.tokenBlacklist.delete(key);
      }
    }
  }
  /**
   * Start cleanup interval for in-memory blacklist
   */
  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupBlacklist();
    }, 60 * 60 * 1000); // Every hour
  }
}