/**
 * Advanced Search Service
 * Handles complex search queries with filters, sorting, and personalization
 */

import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { handleDatabaseOperation, validateRequired } from '../utils/serviceHelper';
import { measurePerformance } from '../utils/performanceBudgets';
import {
  SearchFilters,
  SearchQuery,
  SearchResult,
  ContractorSearchResult,
  JobSearchResult,
  SearchFacets,
  SearchSuggestion,
  FilterPreset,
  SearchPersonalization,
  SearchPerformanceMetrics,
  DEFAULT_FILTER_PRESETS,
} from '../types/search';

export class AdvancedSearchService {
  private static searchCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Search contractors with advanced filters
   */
  static async searchContractors(
    query: SearchQuery,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<ContractorSearchResult>> {
    return measurePerformance('advanced_search_contractors', async () => {
      const context = {
        service: 'AdvancedSearchService',
        method: 'searchContractors',
        params: { query, page, limit },
      };

      validateRequired(query, 'query', context);

      // Check cache first
      const cacheKey = this.generateCacheKey('contractors', query, page, limit);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Returning cached contractor search results', { cacheKey });
        return cached;
      }

      return handleDatabaseOperation(async () => {
        const startTime = Date.now();

        // Build base query
        let queryBuilder = supabase
          .from('contractor_profiles')
          .select(`
            id,
            user_id,
            bio,
            skills,
            hourly_rate,
            rating,
            review_count,
            verified,
            location_city,
            location_state,
            location_coordinates,
            availability_immediate,
            availability_this_week,
            availability_this_month,
            completed_jobs,
            response_time,
            users!inner(
              first_name,
              last_name,
              profile_image_url
            )
          `);

        // Apply text search
        if (query.text.trim()) {
          queryBuilder = queryBuilder.or(
            `bio.ilike.%${query.text}%,skills.cs.{${query.text}},users.first_name.ilike.%${query.text}%,users.last_name.ilike.%${query.text}%`
          );
        }

        // Apply filters
        queryBuilder = this.applyContractorFilters(queryBuilder, query.filters);

        // Apply sorting
        queryBuilder = this.applyContractorSorting(queryBuilder, query.filters.sortBy);

        // Apply pagination
        const offset = (page - 1) * limit;
        queryBuilder = queryBuilder.range(offset, offset + limit - 1);

        const result = await queryBuilder;

        if (result.error) {
          throw new Error(`Search failed: ${result.error.message}`);
        }

        // Transform results
        const contractors = this.transformContractorResults(
          result.data || [],
          query.filters.location.coordinates
        );

        // Get total count for pagination
        const countResult = await this.getContractorCount(query);
        const total = countResult.count || 0;

        // Generate facets
        const facets = await this.generateContractorFacets(query);

        const searchResult: SearchResult<ContractorSearchResult> = {
          items: contractors,
          total,
          page,
          limit,
          hasMore: contractors.length === limit && (page * limit) < total,
          facets,
          query,
          executionTime: Date.now() - startTime,
        };

        // Cache the result
        this.setCache(cacheKey, searchResult);

        logger.info('Contractor search completed', {
          resultsCount: contractors.length,
          totalResults: total,
          executionTime: searchResult.executionTime,
          filters: Object.keys(query.filters).length,
        });

        return { data: searchResult, error: null };
      }, context);
    });
  }

  /**
   * Search jobs with advanced filters
   */
  static async searchJobs(
    query: SearchQuery,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<JobSearchResult>> {
    return measurePerformance('advanced_search_jobs', async () => {
      const context = {
        service: 'AdvancedSearchService',
        method: 'searchJobs',
        params: { query, page, limit },
      };

      validateRequired(query, 'query', context);

      const cacheKey = this.generateCacheKey('jobs', query, page, limit);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      return handleDatabaseOperation(async () => {
        const startTime = Date.now();

        let queryBuilder = supabase
          .from('jobs')
          .select(`
            id,
            title,
            description,
            budget_min,
            budget_max,
            budget_type,
            location_city,
            location_state,
            location_coordinates,
            created_at,
            urgency,
            skills_required,
            project_type,
            status,
            users!inner(
              first_name,
              last_name,
              rating as homeowner_rating,
              review_count as homeowner_reviews
            )
          `)
          .eq('status', 'posted');

        // Apply text search
        if (query.text.trim()) {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${query.text}%,description.ilike.%${query.text}%,skills_required.cs.{${query.text}}`
          );
        }

        // Apply filters
        queryBuilder = this.applyJobFilters(queryBuilder, query.filters);

        // Apply sorting
        queryBuilder = this.applyJobSorting(queryBuilder, query.filters.sortBy);

        // Apply pagination
        const offset = (page - 1) * limit;
        queryBuilder = queryBuilder.range(offset, offset + limit - 1);

        const result = await queryBuilder;

        if (result.error) {
          throw new Error(`Job search failed: ${result.error.message}`);
        }

        // Transform results
        const jobs = this.transformJobResults(
          result.data || [],
          query.filters.location.coordinates
        );

        // Get total count
        const countResult = await this.getJobCount(query);
        const total = countResult.count || 0;

        // Generate facets
        const facets = await this.generateJobFacets(query);

        const searchResult: SearchResult<JobSearchResult> = {
          items: jobs,
          total,
          page,
          limit,
          hasMore: jobs.length === limit && (page * limit) < total,
          facets,
          query,
          executionTime: Date.now() - startTime,
        };

        this.setCache(cacheKey, searchResult);

        return { data: searchResult, error: null };
      }, context);
    });
  }

  /**
   * Get search suggestions based on partial input
   */
  static async getSearchSuggestions(
    input: string,
    type: 'contractors' | 'jobs' = 'contractors',
    limit: number = 5
  ): Promise<SearchSuggestion[]> {
    return measurePerformance('search_suggestions', async () => {
      if (input.length < 2) return [];

      const context = {
        service: 'AdvancedSearchService',
        method: 'getSearchSuggestions',
        params: { input, type, limit },
      };

      const suggestions: SearchSuggestion[] = [];

      try {
        // Skill suggestions
        const skillSuggestions = await this.getSkillSuggestions(input, limit);
        suggestions.push(...skillSuggestions);

        // Location suggestions
        const locationSuggestions = await this.getLocationSuggestions(input, limit);
        suggestions.push(...locationSuggestions);

        // Project type suggestions
        const projectSuggestions = await this.getProjectTypeSuggestions(input, limit);
        suggestions.push(...projectSuggestions);

        // Sort by relevance and limit
        return suggestions
          .sort((a, b) => (b.metadata?.count || 0) - (a.metadata?.count || 0))
          .slice(0, limit);
      } catch (error) {
        logger.error('Error getting search suggestions:', error);
        return [];
      }
    });
  }

  /**
   * Get popular filter presets
   */
  static getFilterPresets(): FilterPreset[] {
    return DEFAULT_FILTER_PRESETS.sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Save user search personalization data
   */
  static async saveSearchPersonalization(
    userId: string,
    personalization: Partial<SearchPersonalization>
  ): Promise<void> {
    return measurePerformance('save_search_personalization', async () => {
      const context = {
        service: 'AdvancedSearchService',
        method: 'saveSearchPersonalization',
        params: { userId, personalization },
      };

      validateRequired(userId, 'userId', context);

      return handleDatabaseOperation(async () => {
        const result = await supabase
          .from('user_search_preferences')
          .upsert({
            user_id: userId,
            preferred_skills: personalization.preferredSkills || [],
            preferred_price_range: personalization.preferredPriceRange,
            preferred_location: personalization.preferredLocation,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        return result;
      }, context);
    });
  }

  /**
   * Get user search personalization data
   */
  static async getSearchPersonalization(userId: string): Promise<SearchPersonalization | null> {
    return measurePerformance('get_search_personalization', async () => {
      const context = {
        service: 'AdvancedSearchService',
        method: 'getSearchPersonalization',
        params: { userId },
      };

      validateRequired(userId, 'userId', context);

      return handleDatabaseOperation(async () => {
        const result = await supabase
          .from('user_search_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (result.error || !result.data) {
          return { data: null, error: null };
        }

        const personalization: SearchPersonalization = {
          userId,
          preferredSkills: result.data.preferred_skills || [],
          preferredPriceRange: result.data.preferred_price_range,
          preferredLocation: result.data.preferred_location,
          searchHistory: [], // Would be loaded separately
          bookmarkedContractors: [], // Would be loaded separately
          contactedContractors: [], // Would be loaded separately
        };

        return { data: personalization, error: null };
      }, context);
    });
  }

  // Private helper methods

  private static applyContractorFilters(queryBuilder: any, filters: SearchFilters) {
    // Skills filter
    if (filters.skills.length > 0) {
      queryBuilder = queryBuilder.overlaps('skills', filters.skills);
    }

    // Rating filter
    if (filters.rating > 0) {
      queryBuilder = queryBuilder.gte('rating', filters.rating);
    }

    // Price range filter
    if (filters.priceRange.min > 0 || filters.priceRange.max < 1000) {
      if (filters.priceRange.hourly) {
        queryBuilder = queryBuilder
          .gte('hourly_rate', filters.priceRange.min)
          .lte('hourly_rate', filters.priceRange.max);
      }
    }

    // Verification filter
    if (filters.verified) {
      queryBuilder = queryBuilder.eq('verified', true);
    }

    // Reviews filter
    if (filters.hasReviews) {
      queryBuilder = queryBuilder.gt('review_count', 0);
    }

    // Availability filter
    switch (filters.availability) {
      case 'immediate':
        queryBuilder = queryBuilder.eq('availability_immediate', true);
        break;
      case 'this_week':
        queryBuilder = queryBuilder.eq('availability_this_week', true);
        break;
      case 'this_month':
        queryBuilder = queryBuilder.eq('availability_this_month', true);
        break;
    }

    return queryBuilder;
  }

  private static applyContractorSorting(queryBuilder: any, sortBy: string) {
    switch (sortBy) {
      case 'rating':
        return queryBuilder.order('rating', { ascending: false });
      case 'price_low':
        return queryBuilder.order('hourly_rate', { ascending: true });
      case 'price_high':
        return queryBuilder.order('hourly_rate', { ascending: false });
      case 'reviews':
        return queryBuilder.order('review_count', { ascending: false });
      default:
        return queryBuilder.order('rating', { ascending: false });
    }
  }

  private static applyJobFilters(queryBuilder: any, filters: SearchFilters) {
    // Skills filter
    if (filters.skills.length > 0) {
      queryBuilder = queryBuilder.overlaps('skills_required', filters.skills);
    }

    // Project type filter
    if (filters.projectType.length > 0) {
      queryBuilder = queryBuilder.in('project_type', filters.projectType);
    }

    // Budget filter
    if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) {
      if (filters.priceRange.hourly) {
        queryBuilder = queryBuilder.eq('budget_type', 'hourly');
      } else {
        queryBuilder = queryBuilder.eq('budget_type', 'fixed');
      }

      queryBuilder = queryBuilder
        .gte('budget_min', filters.priceRange.min)
        .lte('budget_max', filters.priceRange.max);
    }

    return queryBuilder;
  }

  private static applyJobSorting(queryBuilder: any, sortBy: string) {
    switch (sortBy) {
      case 'price_high':
        return queryBuilder.order('budget_max', { ascending: false });
      case 'price_low':
        return queryBuilder.order('budget_min', { ascending: true });
      default:
        return queryBuilder.order('created_at', { ascending: false });
    }
  }

  private static transformContractorResults(
    data: any[],
    userLocation: { latitude: number; longitude: number } | null
  ): ContractorSearchResult[] {
    return data.map((item) => ({
      id: item.id,
      name: `${item.users.first_name} ${item.users.last_name}`,
      profileImage: item.users.profile_image_url,
      skills: item.skills || [],
      rating: item.rating || 0,
      reviewCount: item.review_count || 0,
      hourlyRate: item.hourly_rate,
      location: {
        city: item.location_city || '',
        state: item.location_state || '',
        distance: userLocation && item.location_coordinates
          ? this.calculateDistance(userLocation, item.location_coordinates)
          : 0,
      },
      availability: {
        immediate: item.availability_immediate || false,
        thisWeek: item.availability_this_week || false,
        thisMonth: item.availability_this_month || false,
      },
      verified: item.verified || false,
      description: item.bio || '',
      completedJobs: item.completed_jobs || 0,
      responseTime: item.response_time || 'Unknown',
      matchScore: 85, // Would be calculated based on various factors
    }));
  }

  private static transformJobResults(
    data: any[],
    userLocation: { latitude: number; longitude: number } | null
  ): JobSearchResult[] {
    return data.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      budget: {
        min: item.budget_min,
        max: item.budget_max,
        type: item.budget_type,
      },
      location: {
        city: item.location_city || '',
        state: item.location_state || '',
        distance: userLocation && item.location_coordinates
          ? this.calculateDistance(userLocation, item.location_coordinates)
          : 0,
      },
      postedDate: item.created_at,
      urgency: item.urgency || 'medium',
      skills: item.skills_required || [],
      projectType: item.project_type,
      homeowner: {
        name: `${item.users.first_name} ${item.users.last_name}`,
        rating: item.users.homeowner_rating || 0,
        reviewCount: item.users.homeowner_reviews || 0,
      },
      matchScore: 80,
    }));
  }

  private static async getContractorCount(query: SearchQuery): Promise<{ count: number }> {
    let queryBuilder = supabase
      .from('contractor_profiles')
      .select('id', { count: 'exact', head: true });

    if (query.text.trim()) {
      queryBuilder = queryBuilder.or(
        `bio.ilike.%${query.text}%,skills.cs.{${query.text}}`
      );
    }

    queryBuilder = this.applyContractorFilters(queryBuilder, query.filters);

    const result = await queryBuilder;
    return { count: result.count || 0 };
  }

  private static async getJobCount(query: SearchQuery): Promise<{ count: number }> {
    let queryBuilder = supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'posted');

    if (query.text.trim()) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query.text}%,description.ilike.%${query.text}%`
      );
    }

    queryBuilder = this.applyJobFilters(queryBuilder, query.filters);

    const result = await queryBuilder;
    return { count: result.count || 0 };
  }

  private static async generateContractorFacets(query: SearchQuery): Promise<SearchFacets> {
    // This would generate facet counts for filtering
    // Simplified implementation
    return {
      skills: [],
      projectTypes: [],
      priceRanges: [],
      ratings: [],
      locations: [],
    };
  }

  private static async generateJobFacets(query: SearchQuery): Promise<SearchFacets> {
    return {
      skills: [],
      projectTypes: [],
      priceRanges: [],
      ratings: [],
      locations: [],
    };
  }

  private static async getSkillSuggestions(input: string, limit: number): Promise<SearchSuggestion[]> {
    const skills = [
      'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Painting',
      'Flooring', 'Kitchen Renovation', 'Bathroom Renovation',
    ];

    return skills
      .filter(skill => skill.toLowerCase().includes(input.toLowerCase()))
      .slice(0, limit)
      .map(skill => ({
        text: skill,
        type: 'skill',
        icon: 'build',
        metadata: { count: Math.floor(Math.random() * 100) },
      }));
  }

  private static async getLocationSuggestions(input: string, limit: number): Promise<SearchSuggestion[]> {
    // This would query a locations database
    return [];
  }

  private static async getProjectTypeSuggestions(input: string, limit: number): Promise<SearchSuggestion[]> {
    const types = ['emergency', 'maintenance', 'installation', 'repair', 'renovation'];

    return types
      .filter(type => type.toLowerCase().includes(input.toLowerCase()))
      .slice(0, limit)
      .map(type => ({
        text: type,
        type: 'project',
        icon: 'construct',
        metadata: { count: Math.floor(Math.random() * 50) },
      }));
  }

  private static calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  private static generateCacheKey(type: string, query: SearchQuery, page: number, limit: number): string {
    const queryString = JSON.stringify({
      type,
      text: query.text,
      filters: query.filters,
      page,
      limit,
    });
    return Buffer.from(queryString).toString('base64');
  }

  private static getFromCache(key: string): any {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.searchCache.delete(key);
    }
    return null;
  }

  private static setCache(key: string, data: any): void {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }
}

export default AdvancedSearchService;