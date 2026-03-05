import type { SearchQuery } from '../../types/search';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const searchCache = new Map<string, { data: unknown; timestamp: number }>();

export function generateCacheKey(type: string, query: SearchQuery, page: number, limit: number): string {
  const queryString = JSON.stringify({ type, text: query.text, filters: query.filters, page, limit });
  return Buffer.from(queryString).toString('base64');
}

export function getFromCache(key: string): unknown {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  if (cached) {
    searchCache.delete(key);
  }
  return null;
}

export function setCache(key: string, data: unknown): void {
  searchCache.set(key, { data, timestamp: Date.now() });
  // Evict oldest entry when cache exceeds 100 entries
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey !== undefined) searchCache.delete(oldestKey);
  }
}
