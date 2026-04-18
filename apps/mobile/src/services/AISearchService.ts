/**
 * AISearchService for Mobile
 *
 * HTTP client for AI-powered semantic search.
 * All AI operations route through Next.js API routes (no direct Supabase calls).
 * Types are shared from @mintenance/ai-core.
 *
 * Fixed 2026-04-16: Previously used raw `fetch()` without auth token injection,
 * retries, or timeout handling. Now uses `mobileApiClient` which handles all of
 * these automatically via the token-refresh queue in MobileApiClient.request().
 */

import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';
import type {
  SearchResult,
  SearchFilters,
  SearchSuggestion,
} from '@mintenance/ai-core';

export type {
  SearchResult,
  SearchFilters,
  SearchSuggestion,
} from '@mintenance/ai-core';

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

      const data = await mobileApiClient.post<{ results: SearchResult[] }>(
        '/api/ai/search',
        { query, filters, limit }
      );

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

      const data = await mobileApiClient.post<{
        suggestions: SearchSuggestion[];
      }>('/api/ai/search-suggestions', { query: partialQuery, limit });

      return data.suggestions;
    } catch (error) {
      logger.error('Failed to get search suggestions', error);
      return this.getPopularSearches(limit);
    }
  }

  /**
   * Get trending searches
   */
  static async getTrendingSearches(
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      const data = await mobileApiClient.get<{
        trending: SearchSuggestion[];
      }>(`/api/ai/trending-searches?limit=${limit}`);
      return data.trending;
    } catch (error) {
      logger.error('Failed to get trending searches', error);
      return [];
    }
  }

  /**
   * Search for similar jobs
   */
  static async findSimilarJobs(
    jobId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const data = await mobileApiClient.get<{ similar: SearchResult[] }>(
        `/api/ai/similar-jobs/${jobId}?limit=${limit}`
      );
      return data.similar;
    } catch (error) {
      logger.error('Failed to find similar jobs', error);
      throw error;
    }
  }

  /**
   * Get popular searches (fallback — no API call, static data)
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
