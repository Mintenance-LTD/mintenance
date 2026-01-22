import { logger } from '@mintenance/shared';

/**
 * AI Search Service - Core search functionality with semantic and full-text search
 */
interface SearchResult {
  id: string;
  type: 'job' | 'contractor' | 'property';
  title: string;
  description: string;
  relevanceScore: number;
  metadata: {
    location?: string;
    category?: string;
    price?: number;
    availability?: string;
    rating?: number;
    [key: string]: unknown;
  };
  highlights?: string[];
}
interface SearchParams {
  query: string;
  embedding?: number[];
  filters?: any;
  limit: number;
  userId?: string;
}
export class AISearchService {
  private supabase: any;
  constructor(config: { supabase: any }) {
    this.supabase = config.supabase;
  }
  /**
   * Perform semantic search using embeddings
   */
  async semanticSearch(params: SearchParams): Promise<SearchResult[]> {
    try {
      if (!params.embedding) {
        throw new Error('Embedding required for semantic search');
      }
      // Search jobs, contractors, and properties in parallel
      const [jobs, contractors, properties] = await Promise.all([
        this.searchJobsByEmbedding(params),
        this.searchContractorsByEmbedding(params),
        this.searchPropertiesByEmbedding(params)
      ]);
      // Combine all results
      const allResults = [...jobs, ...contractors, ...properties];
      // Sort by relevance score
      return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      logger.error('Semantic search error:', error);
      return [];
    }
  }
  /**
   * Perform full-text search as fallback
   */
  async fullTextSearch(params: SearchParams): Promise<SearchResult[]> {
    try {
      // Search using PostgreSQL full-text search
      const [jobs, contractors, properties] = await Promise.all([
        this.fullTextSearchJobs(params),
        this.fullTextSearchContractors(params),
        this.fullTextSearchProperties(params)
      ]);
      // Combine all results
      const allResults = [...jobs, ...contractors, ...properties];
      // Sort by relevance score
      return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      logger.error('Full-text search error:', error);
      return [];
    }
  }
  /**
   * Get popular searches
   */
  async getPopularSearches(query: string, limit: number): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('search_analytics')
        .select('query, count')
        .ilike('query', `${query}%`)
        .order('count', { ascending: false })
        .limit(limit);
      return data?.map((d: any) => d.query) || [];
    } catch (error) {
      logger.error('Error getting popular searches:', error);
      return [];
    }
  }
  /**
   * Get recent searches for user
   */
  async getRecentSearches(query: string, limit: number): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('user_search_history')
        .select('query')
        .ilike('query', `${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data?.map((d: any) => d.query) || [];
    } catch (error) {
      logger.error('Error getting recent searches:', error);
      return [];
    }
  }
  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(query: string, limit: number): Promise<string[]> {
    try {
      // Use a combination of job titles, categories, and skills
      const [titles, categories, skills] = await Promise.all([
        this.supabase
          .from('jobs')
          .select('title')
          .ilike('title', `${query}%`)
          .limit(limit / 3),
        this.supabase
          .from('categories')
          .select('name')
          .ilike('name', `${query}%`)
          .limit(limit / 3),
        this.supabase
          .from('skills')
          .select('name')
          .ilike('name', `${query}%`)
          .limit(limit / 3)
      ]);
      const suggestions = [
        ...(titles.data?.map((t: any) => t.title) || []),
        ...(categories.data?.map((c: any) => c.name) || []),
        ...(skills.data?.map((s: any) => s.name) || [])
      ];
      return [...new Set(suggestions)].slice(0, limit);
    } catch (error) {
      logger.error('Error getting autocomplete suggestions:', error);
      return [];
    }
  }
  /**
   * Get trending searches
   */
  async getTrendingSearches(params: {
    category?: string | null;
    limit: number;
    timeRange: string;
  }): Promise<any[]> {
    try {
      const startDate = this.parseTimeRange(params.timeRange);
      let query = this.supabase
        .from('search_trends')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('search_count', { ascending: false })
        .limit(params.limit);
      if (params.category) {
        query = query.eq('category', params.category);
      }
      const { data } = await query;
      return data || [];
    } catch (error) {
      logger.error('Error getting trending searches:', error);
      return [];
    }
  }
  /**
   * Get item embedding for similarity search
   */
  async getItemEmbedding(itemId: string, itemType: string): Promise<number[] | null> {
    try {
      const table = `${itemType}_embeddings`;
      const { data } = await this.supabase
        .from(table)
        .select('embedding')
        .eq('id', itemId)
        .single();
      return data?.embedding || null;
    } catch (error) {
      logger.error('Error getting item embedding:', error);
      return null;
    }
  }
  /**
   * Find similar items by embedding
   */
  async findSimilarByEmbedding(
    embedding: number[],
    itemType: string,
    options: { excludeId?: string; limit: number }
  ): Promise<SearchResult[]> {
    try {
      // Use pgvector similarity search
      const { data } = await this.supabase.rpc('search_similar_items', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: options.limit,
        item_type: itemType,
        exclude_id: options.excludeId
      });
      return (data || []).map((item: any) => ({
        id: item.id,
        type: itemType as any,
        title: item.title,
        description: item.description,
        relevanceScore: item.similarity,
        metadata: item.metadata || {}
      }));
    } catch (error) {
      logger.error('Error finding similar items:', error);
      return [];
    }
  }
  /**
   * Record search feedback
   */
  async recordSearchFeedback(feedback: {
    searchId: string;
    resultId?: string;
    action: string;
    position?: number;
    query?: string;
    userId?: string;
    timestamp: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('search_feedback')
        .insert({
          search_id: feedback.searchId,
          result_id: feedback.resultId,
          action: feedback.action,
          position: feedback.position,
          query: feedback.query,
          user_id: feedback.userId,
          created_at: feedback.timestamp
        });
    } catch (error) {
      logger.error('Error recording search feedback:', error);
    }
  }
  // ============= Private Helper Methods =============
  private async searchJobsByEmbedding(params: SearchParams): Promise<SearchResult[]> {
    try {
      // Use pgvector for similarity search
      const { data } = await this.supabase.rpc('search_jobs_by_embedding', {
        query_embedding: params.embedding,
        match_threshold: 0.5,
        match_count: params.limit,
        filters: params.filters
      });
      return (data || []).map((job: any) => ({
        id: job.id,
        type: 'job' as const,
        title: job.title,
        description: job.description,
        relevanceScore: job.similarity,
        metadata: {
          location: job.location,
          category: job.category,
          price: job.budget,
          availability: job.status
        }
      }));
    } catch (error) {
      logger.error('Error searching jobs by embedding:', error);
      return [];
    }
  }
  private async searchContractorsByEmbedding(params: SearchParams): Promise<SearchResult[]> {
    try {
      const { data } = await this.supabase.rpc('search_contractors_by_embedding', {
        query_embedding: params.embedding,
        match_threshold: 0.5,
        match_count: params.limit,
        filters: params.filters
      });
      return (data || []).map((contractor: any) => ({
        id: contractor.id,
        type: 'contractor' as const,
        title: contractor.business_name || contractor.name,
        description: contractor.bio || contractor.description,
        relevanceScore: contractor.similarity,
        metadata: {
          location: contractor.location,
          category: contractor.specialty,
          rating: contractor.rating,
          availability: contractor.availability_status
        }
      }));
    } catch (error) {
      logger.error('Error searching contractors by embedding:', error);
      return [];
    }
  }
  private async searchPropertiesByEmbedding(params: SearchParams): Promise<SearchResult[]> {
    try {
      const { data } = await this.supabase.rpc('search_properties_by_embedding', {
        query_embedding: params.embedding,
        match_threshold: 0.5,
        match_count: params.limit,
        filters: params.filters
      });
      return (data || []).map((property: any) => ({
        id: property.id,
        type: 'property' as const,
        title: property.address || property.name,
        description: property.description,
        relevanceScore: property.similarity,
        metadata: {
          location: property.location,
          category: property.type,
          price: property.value
        }
      }));
    } catch (error) {
      logger.error('Error searching properties by embedding:', error);
      return [];
    }
  }
  private async fullTextSearchJobs(params: SearchParams): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('jobs')
        .select('*')
        .or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`)
        .limit(params.limit);
      // Apply filters
      if (params.filters?.category) {
        query = query.eq('category', params.filters.category);
      }
      if (params.filters?.location) {
        query = query.ilike('location', `%${params.filters.location}%`);
      }
      const { data } = await query;
      return (data || []).map((job: any) => ({
        id: job.id,
        type: 'job' as const,
        title: job.title,
        description: job.description,
        relevanceScore: this.calculateTextMatchScore(params.query, job),
        metadata: {
          location: job.location,
          category: job.category,
          price: job.budget,
          availability: job.status
        }
      }));
    } catch (error) {
      logger.error('Error in full-text job search:', error);
      return [];
    }
  }
  private async fullTextSearchContractors(params: SearchParams): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('contractors')
        .select('*')
        .or(`business_name.ilike.%${params.query}%,bio.ilike.%${params.query}%,skills.cs.{${params.query}}`)
        .limit(params.limit);
      const { data } = await query;
      return (data || []).map((contractor: any) => ({
        id: contractor.id,
        type: 'contractor' as const,
        title: contractor.business_name || contractor.name,
        description: contractor.bio,
        relevanceScore: this.calculateTextMatchScore(params.query, contractor),
        metadata: {
          location: contractor.location,
          category: contractor.specialty,
          rating: contractor.rating,
          availability: contractor.availability_status
        }
      }));
    } catch (error) {
      logger.error('Error in full-text contractor search:', error);
      return [];
    }
  }
  private async fullTextSearchProperties(params: SearchParams): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('properties')
        .select('*')
        .or(`address.ilike.%${params.query}%,description.ilike.%${params.query}%`)
        .limit(params.limit);
      const { data } = await query;
      return (data || []).map((property: any) => ({
        id: property.id,
        type: 'property' as const,
        title: property.address || property.name,
        description: property.description,
        relevanceScore: this.calculateTextMatchScore(params.query, property),
        metadata: {
          location: property.location,
          category: property.type,
          price: property.value
        }
      }));
    } catch (error) {
      logger.error('Error in full-text property search:', error);
      return [];
    }
  }
  private calculateTextMatchScore(query: string, item: any): number {
    const queryLower = query.toLowerCase();
    const titleLower = (item.title || item.business_name || item.address || '').toLowerCase();
    const descLower = (item.description || item.bio || '').toLowerCase();
    let score = 0;
    // Exact match in title
    if (titleLower === queryLower) score += 1;
    // Title contains query
    else if (titleLower.includes(queryLower)) score += 0.7;
    // Description contains query
    if (descLower.includes(queryLower)) score += 0.3;
    // Word match
    const queryWords = queryLower.split(' ');
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 0.1;
      if (descLower.includes(word)) score += 0.05;
    });
    return Math.min(score, 1); // Cap at 1
  }
  private parseTimeRange(timeRange: string): Date {
    const now = new Date();
    const match = timeRange.match(/(\d+)([dhm])/);
    if (!match) return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [, value, unit] = match;
    const num = parseInt(value);
    switch (unit) {
      case 'd':
        return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() - num * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - num * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
}