/**
 * AISearchService for Web
 *
 * Thin HTTP client for AI-powered semantic search.
 * Types are shared from @mintenance/ai-core.
 */

import { logger } from '@mintenance/shared';
import type { SearchResult, SearchFilters, SearchSuggestion } from '@mintenance/ai-core';

export type { SearchResult, SearchFilters, SearchSuggestion } from '@mintenance/ai-core';

export class AISearchService {
  private static readonly MAX_RESULTS = 50;
  private static readonly RELEVANCE_THRESHOLD = 0.7;

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

      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      logger.info('AI search completed', {
        service: 'AISearchService',
        query,
        resultsCount: data.results.length,
        searchTime: Date.now() - startTime,
      });

      return data.results;
    } catch (error) {
      logger.error('AI search failed', error, { service: 'AISearchService', query });
      throw error;
    }
  }

  /**
   * Get search suggestions based on query
   */
  static async getSearchSuggestions(
    partialQuery: string,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      if (partialQuery.length < 2) {
        return this.getPopularSearches(limit);
      }

      const response = await fetch('/api/ai/search-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: partialQuery,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
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
      const response = await fetch(`/api/ai/trending-searches?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to get trending searches');
      }

      const data = await response.json();
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
      const response = await fetch(`/api/ai/similar-jobs/${jobId}?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to find similar jobs');
      }

      const data = await response.json();
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
