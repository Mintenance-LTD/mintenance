/**
 * AISearchService
 * 
 * Provides AI-powered semantic search capabilities for jobs, contractors, and content.
 * Uses OpenAI embeddings for intelligent matching and natural language processing.
 */

import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

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
    [key: string]: any;
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
  private static readonly EMBEDDING_MODEL = 'text-embedding-3-small';
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
      
      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search jobs
      const jobResults = await this.searchJobs(queryEmbedding, filters, limit);
      
      // Search contractors
      const contractorResults = await this.searchContractors(queryEmbedding, filters, limit);
      
      // Combine and rank results
      const allResults = [...jobResults, ...contractorResults];
      const rankedResults = this.rankResults(allResults, query);
      
      // Apply additional filters
      const filteredResults = this.applyFilters(rankedResults, filters);
      
      // Log search analytics
      await this.logSearchAnalytics({
        query,
        resultsCount: filteredResults.length,
        clickThroughRate: 0, // Will be updated when user clicks
        averageRelevanceScore: this.calculateAverageRelevance(filteredResults),
        searchTime: Date.now() - startTime,
        filters,
      });

      logger.info('AI search completed', {
        query,
        resultsCount: filteredResults.length,
        searchTime: Date.now() - startTime,
      });

      return filteredResults.slice(0, limit);
    } catch (error) {
      logger.error('AI search failed', error);
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

      // Get suggestions from multiple sources
      const [querySuggestions, categorySuggestions, locationSuggestions] = await Promise.all([
        this.getQuerySuggestions(partialQuery, limit),
        this.getCategorySuggestions(partialQuery, limit),
        this.getLocationSuggestions(partialQuery, limit),
      ]);

      // Combine and rank suggestions
      const allSuggestions = [...querySuggestions, ...categorySuggestions, ...locationSuggestions];
      const rankedSuggestions = this.rankSuggestions(allSuggestions, partialQuery);

      return rankedSuggestions.slice(0, limit);
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
      const { data, error } = await supabase
        .from('search_analytics')
        .select('query, COUNT(*) as count')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .group('query')
        .order('count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(item => ({
        text: item.query,
        type: 'query' as const,
        popularity: item.count,
      }));
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
      // Get the job details
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      // Generate embedding for the job
      const jobText = `${job.title} ${job.description} ${job.category}`;
      const jobEmbedding = await this.generateEmbedding(jobText);

      // Find similar jobs
      const { data: similarJobs, error: searchError } = await supabase
        .rpc('search_similar_jobs', {
          job_embedding: jobEmbedding,
          job_id: jobId,
          limit: limit,
        });

      if (searchError) throw searchError;

      return similarJobs.map((job: any) => ({
        id: job.id,
        type: 'job' as const,
        title: job.title,
        description: job.description,
        relevanceScore: job.similarity_score,
        metadata: {
          location: job.location,
          category: job.category,
          price: job.budget,
          availability: job.status,
        },
      }));
    } catch (error) {
      logger.error('Failed to find similar jobs', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('/api/ai/generate-embedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          model: this.EMBEDDING_MODEL,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate embedding');
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', error);
      throw error;
    }
  }

  /**
   * Search jobs using semantic similarity
   */
  private static async searchJobs(
    queryEmbedding: number[],
    filters: SearchFilters,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_jobs_semantic', {
          query_embedding: queryEmbedding,
          category_filter: filters.category,
          location_filter: filters.location,
          price_min: filters.priceRange?.min,
          price_max: filters.priceRange?.max,
          limit: limit,
        });

      if (error) throw error;

      return data.map((job: any) => ({
        id: job.id,
        type: 'job' as const,
        title: job.title,
        description: job.description,
        relevanceScore: job.similarity_score,
        metadata: {
          location: job.location,
          category: job.category,
          price: job.budget,
          availability: job.status,
        },
      }));
    } catch (error) {
      logger.error('Failed to search jobs', error);
      return [];
    }
  }

  /**
   * Search contractors using semantic similarity
   */
  private static async searchContractors(
    queryEmbedding: number[],
    filters: SearchFilters,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_contractors_semantic', {
          query_embedding: queryEmbedding,
          category_filter: filters.category,
          location_filter: filters.location,
          rating_filter: filters.rating,
          limit: limit,
        });

      if (error) throw error;

      return data.map((contractor: any) => ({
        id: contractor.id,
        type: 'contractor' as const,
        title: `${contractor.first_name} ${contractor.last_name}`,
        description: contractor.bio || contractor.specialties?.join(', ') || '',
        relevanceScore: contractor.similarity_score,
        metadata: {
          location: contractor.location,
          category: contractor.specialties?.[0],
          rating: contractor.rating,
          availability: contractor.availability,
        },
      }));
    } catch (error) {
      logger.error('Failed to search contractors', error);
      return [];
    }
  }

  /**
   * Rank search results by relevance and other factors
   */
  private static rankResults(results: SearchResult[], query: string): SearchResult[] {
    return results
      .map(result => ({
        ...result,
        relevanceScore: this.calculateRelevanceScore(result, query),
      }))
      .filter(result => result.relevanceScore >= this.RELEVANCE_THRESHOLD)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score for a result
   */
  private static calculateRelevanceScore(result: SearchResult, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const descriptionLower = result.description.toLowerCase();

    let score = result.relevanceScore; // Base semantic similarity

    // Boost score for exact matches
    if (titleLower.includes(queryLower)) {
      score += 0.2;
    }
    if (descriptionLower.includes(queryLower)) {
      score += 0.1;
    }

    // Boost score for high-rated contractors
    if (result.type === 'contractor' && result.metadata.rating) {
      score += (result.metadata.rating - 3) * 0.05; // Boost for ratings above 3
    }

    // Boost score for available contractors
    if (result.type === 'contractor' && result.metadata.availability === 'available') {
      score += 0.1;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Apply additional filters to results
   */
  private static applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    return results.filter(result => {
      // Location filter
      if (filters.location && result.metadata.location) {
        if (!result.metadata.location.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
      }

      // Category filter
      if (filters.category && result.metadata.category) {
        if (result.metadata.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      // Price range filter
      if (filters.priceRange && result.metadata.price) {
        const price = result.metadata.price;
        if (price < filters.priceRange.min || price > filters.priceRange.max) {
          return false;
        }
      }

      // Rating filter
      if (filters.rating && result.metadata.rating) {
        if (result.metadata.rating < filters.rating) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get popular searches
   */
  private static async getPopularSearches(limit: number): Promise<SearchSuggestion[]> {
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

  /**
   * Get query suggestions
   */
  private static async getQuerySuggestions(
    partialQuery: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('query')
        .ilike('query', `${partialQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(item => ({
        text: item.query,
        type: 'query' as const,
        popularity: 1,
      }));
    } catch (error) {
      logger.error('Failed to get query suggestions', error);
      return [];
    }
  }

  /**
   * Get category suggestions
   */
  private static async getCategorySuggestions(
    partialQuery: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    const categories = [
      'plumbing', 'electrical', 'HVAC', 'roofing', 'flooring',
      'kitchen', 'bathroom', 'painting', 'landscaping', 'cleaning',
    ];

    return categories
      .filter(category => category.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, limit)
      .map(category => ({
        text: category,
        type: 'category' as const,
        popularity: 1,
      }));
  }

  /**
   * Get location suggestions
   */
  private static async getLocationSuggestions(
    partialQuery: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('location')
        .ilike('location', `%${partialQuery}%`)
        .limit(limit);

      if (error) throw error;

      const uniqueLocations = [...new Set(data.map(item => item.location))];
      return uniqueLocations.map(location => ({
        text: location,
        type: 'location' as const,
        popularity: 1,
      }));
    } catch (error) {
      logger.error('Failed to get location suggestions', error);
      return [];
    }
  }

  /**
   * Rank suggestions by relevance
   */
  private static rankSuggestions(
    suggestions: SearchSuggestion[],
    partialQuery: string
  ): SearchSuggestion[] {
    return suggestions
      .map(suggestion => ({
        ...suggestion,
        relevanceScore: this.calculateSuggestionRelevance(suggestion, partialQuery),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score for suggestions
   */
  private static calculateSuggestionRelevance(
    suggestion: SearchSuggestion,
    partialQuery: string
  ): number {
    const suggestionLower = suggestion.text.toLowerCase();
    const queryLower = partialQuery.toLowerCase();

    if (suggestionLower.startsWith(queryLower)) {
      return 1.0; // Exact prefix match
    }
    if (suggestionLower.includes(queryLower)) {
      return 0.8; // Contains query
    }
    return suggestion.popularity * 0.1; // Base on popularity
  }

  /**
   * Calculate average relevance score
   */
  private static calculateAverageRelevance(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, result) => acc + result.relevanceScore, 0);
    return sum / results.length;
  }

  /**
   * Log search analytics
   */
  private static async logSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      const { error } = await supabase
        .from('search_analytics')
        .insert({
          query: analytics.query,
          results_count: analytics.resultsCount,
          click_through_rate: analytics.clickThroughRate,
          average_relevance_score: analytics.averageRelevanceScore,
          search_time: analytics.searchTime,
          filters: analytics.filters,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to log search analytics', error);
    }
  }
}
