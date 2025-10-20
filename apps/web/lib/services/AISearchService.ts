/**
 * AISearchService for Web
 *
 * Provides AI-powered semantic search capabilities for jobs, contractors, and content.
 * Uses OpenAI embeddings for intelligent matching and natural language processing.
 */

export interface SearchResult {
  id: string;
  type: 'job' | 'contractor' | 'service';
  title: string;
  description: string;
  relevanceScore: number;
  metadata: {
    location?: string;
    category?: string;
    price?: number;
    rating?: number;
    availability?: string;
    [key: string]: unknown;
  };
}

export interface SearchFilters {
  category?: string;
  location?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  availability?: string;
  distance?: number; // in miles
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'category' | 'location';
  popularity: number;
}

export interface SearchAnalytics {
  query: string;
  resultsCount: number;
  clickThroughRate: number;
  averageRelevanceScore: number;
  searchTime: number;
  filters: SearchFilters;
}

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

      console.log('AI search completed', {
        query,
        resultsCount: data.results.length,
        searchTime: Date.now() - startTime,
      });

      return data.results;
    } catch (error) {
      console.error('AI search failed', error);
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
      console.error('Failed to get search suggestions', error);
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
      console.error('Failed to get trending searches', error);
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
      console.error('Failed to find similar jobs', error);
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
