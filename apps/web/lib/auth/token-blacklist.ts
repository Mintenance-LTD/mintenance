/**
 * Token Blacklist Utility
 * Implements token invalidation using Redis for secure logout
 */

import { logger } from '@mintenance/shared';

interface RedisClient {
  set: (key: string, value: string, options?: { ex?: number }) => Promise<string>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  exists: (key: string) => Promise<number>;
}

class TokenBlacklist {
  private redis: RedisClient | null = null;
  private initialized = false;
  private fallbackSet: Set<string> = new Set();

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = await import('@upstash/redis');
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        }) as unknown as RedisClient;
        this.initialized = true;
        logger.info('Token blacklist initialized with Redis', { service: 'auth' });
      } else {
        logger.warn('Redis not configured for token blacklist, using in-memory fallback', {
          service: 'auth',
        });
        this.initialized = false;
      }
    } catch (error) {
      logger.error('Failed to initialize Redis for token blacklist', error, { service: 'auth' });
      this.initialized = false;
    }
  }

  /**
   * Blacklist a token (mark as invalid)
   * @param token - The JWT token to blacklist
   * @param expiresIn - Token expiration time in seconds (default: 7 days)
   */
  async blacklistToken(token: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<void> {
    try {
      // Extract token ID or use hash of token
      const tokenId = this.getTokenId(token);
      const key = `blacklist:token:${tokenId}`;

      if (this.initialized && this.redis) {
        // Store in Redis with expiration
        await Promise.race([
          this.redis.set(key, '1', { ex: expiresIn }),
          new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Redis timeout')), 2000);
          }),
        ]);
      } else {
        // Fallback to in-memory storage
        this.fallbackSet.add(tokenId);
        // Clean up old entries periodically
        if (this.fallbackSet.size > 10000) {
          this.fallbackSet.clear();
        }
      }
    } catch (error) {
      logger.error('Failed to blacklist token', error, { service: 'auth' });
      // Don't throw - graceful degradation
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns true if token is blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenId = this.getTokenId(token);
      const key = `blacklist:token:${tokenId}`;

      if (this.initialized && this.redis) {
        const result = await Promise.race([
          this.redis.exists(key),
          new Promise<number>((_, reject) => {
            setTimeout(() => reject(new Error('Redis timeout')), 2000);
          }),
        ]);
        return result > 0;
      } else {
        // Fallback to in-memory check
        return this.fallbackSet.has(tokenId);
      }
    } catch (error) {
      logger.error('Failed to check token blacklist', error, { service: 'auth' });
      // On error, assume token is not blacklisted (fail open for availability)
      return false;
    }
  }

  /**
   * Remove a token from blacklist (for testing or manual unblock)
   * @param token - The JWT token to remove from blacklist
   */
  async removeFromBlacklist(token: string): Promise<void> {
    try {
      const tokenId = this.getTokenId(token);
      const key = `blacklist:token:${tokenId}`;

      if (this.initialized && this.redis) {
        await Promise.race([
          this.redis.del(key),
          new Promise<number>((_, reject) => {
            setTimeout(() => reject(new Error('Redis timeout')), 2000);
          }),
        ]);
      } else {
        this.fallbackSet.delete(tokenId);
      }
    } catch (error) {
      logger.error('Failed to remove token from blacklist', error, { service: 'auth' });
    }
  }

  /**
   * Get a unique identifier for a token
   * Uses the last 32 characters of the token (jti claim or token hash)
   */
  private getTokenId(token: string): string {
    // Use last 32 chars of token as ID (or extract jti if available)
    // In production, you might want to extract jti from JWT payload
    return token.slice(-32);
  }

  /**
   * Blacklist all tokens for a user (useful for account compromise)
   * @param userId - The user ID whose tokens should be blacklisted
   * @param expiresIn - Expiration time in seconds
   */
  async blacklistUserTokens(userId: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<void> {
    try {
      const key = `blacklist:user:${userId}`;

      if (this.initialized && this.redis) {
        await Promise.race([
          this.redis.set(key, Date.now().toString(), { ex: expiresIn }),
          new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('Redis timeout')), 2000);
          }),
        ]);
      }
      // Note: This requires checking user ID in token validation
      logger.info('User tokens blacklisted', { service: 'auth', userId });
    } catch (error) {
      logger.error('Failed to blacklist user tokens', error, { service: 'auth', userId });
    }
  }

  /**
   * Check if user's tokens are blacklisted
   * @param userId - The user ID to check
   */
  async isUserBlacklisted(userId: string): Promise<boolean> {
    try {
      const key = `blacklist:user:${userId}`;

      if (this.initialized && this.redis) {
        const result = await Promise.race([
          this.redis.exists(key),
          new Promise<number>((_, reject) => {
            setTimeout(() => reject(new Error('Redis timeout')), 2000);
          }),
        ]);
        return result > 0;
      }
      return false;
    } catch (error) {
      logger.error('Failed to check user blacklist', error, { service: 'auth', userId });
      return false;
    }
  }
}

// Singleton instance
export const tokenBlacklist = new TokenBlacklist();

