import { logger } from '@mintenance/shared';
import type { RateLimitStore, RedisLikeClient } from './types';

export class UpstashStore implements RateLimitStore {
  private client: RedisLikeClient | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      if (
        !process.env.UPSTASH_REDIS_REST_URL ||
        !process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        throw new Error('Upstash Redis credentials not configured');
      }
      const { Redis } = await import('@upstash/redis');
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }) as RedisLikeClient;
      await this.client.ping();
      this.initialized = true;
      logger.info('Upstash Redis rate limiter initialized', {
        service: 'rate-limiter',
      });
    } catch (error) {
      logger.error('Failed to initialize Upstash Redis', error, {
        service: 'rate-limiter',
      });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.initialized) await this.init();
    return await this.client!.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.initialized) await this.init();
    await this.client!.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    if (!this.initialized) await this.init();
    return await this.client!.ttl(key);
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.initialized) await this.init();
      await this.client!.ping();
      return true;
    } catch {
      return false;
    }
  }
}
