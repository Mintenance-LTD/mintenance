/**
 * AISearchService for Mobile
 *
 * HTTP client for AI-powered semantic search.
 * All AI operations route through Next.js API routes (no direct Supabase calls).
 * Types are shared from @mintenance/ai-core.
 */

import { logger } from '../utils/logger';
import type { SearchResult, SearchFilters, SearchSuggestion } from '@mintenance/ai-core';

export type { SearchResult, SearchFilters, SearchSuggestion } from '@mintenance/ai-core';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export class AISearchService {
  /**
   * Perform semantic search across jobs and contractors
   */
  static async search(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      const startTime = Date.now();

      const data = await apiFetch<{ results: SearchResult[] }>('/ai/search', {
        method: 'POST',
        body: JSON.stringify({ query, filters, limit }),
      });

      logger.info('AI search completed', {
        query,
        resultsCount: data.results.length,
        searchTime: Date.now() - startTime,
      });

      return data.results;
    } catch (error) {
      logger.error('AI search failed', error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(
    partialQuery: string,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      if (partialQuery.length < 2) {
        return this.getPopularSearches(limit);
      }

      const data = await apiFetch<{ suggestions: SearchSuggestion[] }>(
        '/ai/search-suggestions',
        {
          method: 'POST',
          body: JSON.stringify({ query: partialQuery, limit }),
        }
      );

      return data.suggestions;
    } catch (error) {
      logger.error('Failed to get search suggestions', error);
      return this.getPopularSearches(limit);
    }
  }

  /**
   * Get trending searches
   */
  static async getTrendingSearches(limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const data = await apiFetch<{ trending: SearchSuggestion[] }>(
        `/ai/trending-searches?limit=${limit}`
      );
      return data.trending;
    } catch (error) {
      logger.error('Failed to get trending searches', error);
      return [];
    }
  }

  /**
   * Search for similar jobs
   */
  static async findSimilarJobs(jobId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const data = await apiFetch<{ similar: SearchResult[] }>(
        `/ai/similar-jobs/${jobId}?limit=${limit}`
      );
      return data.similar;
    } catch (error) {
      logger.error('Failed to find similar jobs', error);
      throw error;
    }
  }

  /**
   * Get popular searches (fallback)
   */
  private static getPopularSearches(limit: number): SearchSuggestion[] {
    const popularSearches = [
      'plumber near me',
      'electrician',
      'home renovation',
      'kitchen remodel',
      'bathroom repair',
      'HVAC service',
      'roofing contractor',
      'handyman',
      'cleaning service',
      'landscaping',
    ];

    return popularSearches.slice(0, limit).map((search, index) => ({
      text: search,
      type: 'query' as const,
      popularity: popularSearches.length - index,
    }));
  }
}

export default AISearchService;
