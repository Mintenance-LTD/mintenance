import type { RateLimitStore } from './types';

/**
 * In-memory store (development/fallback only)
 * WARNING: Does not sync across instances in production
 */
export class InMemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiry: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry || entry.expiry < now) {
      this.store.set(key, { count: 1, expiry: now + 60000 });
      return 1;
    }
    entry.count++;
    return entry.count;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) entry.expiry = Date.now() + seconds * 1000;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -1;
    const ttl = Math.ceil((entry.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -1;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiry < now) this.store.delete(key);
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}
