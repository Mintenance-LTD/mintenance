/**
 * Advanced Search Service
 * Handles complex search queries with filters, sorting, and personalization
 */

import { supabase } from '../config/supabase';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { logger } from '../utils/logger';
import { handleDatabaseOperation, validateRequired } from '../utils/serviceHelper';
import { performanceMonitor } from '../utils/performance';
import { sanitizeForSQL } from '../utils/sqlSanitization';
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
  LocationRadius,
  ProjectType,
  DEFAULT_FILTER_PRESETS,
} from '../types/search';

// Database row interfaces matching snake_case DB schema
interface DatabaseContractorProfileRow {
  id: string;
  user_id: string;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
  location_city: string | null;
  location_state: string | null;
  location_coordinates: { latitude: number; longitude: number } | null;
  availability_immediate: boolean | null;
  availability_this_week: boolean | null;
  availability_this_month: boolean | null;
  completed_jobs: number | null;
  response_time: string | null;
  users?: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
  };
}

interface DatabaseJobRow {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: 'hourly' | 'fixed';
  location_city: string | null;
  location_state: string | null;
  location_coordinates: { latitude: number; longitude: number } | null;
  created_at: string;
  urgency: 'low' | 'medium' | 'high' | null;
  skills_required: string[] | null;
  project_type: string;
  status: string;
  users?: {
    first_name: string;
    last_name: string;
    homeowner_rating: number | null;
    homeowner_reviews: number | null;
  };
}

interface DatabaseUserSearchPreferenceRow {
  user_id: string;
  preferred_skills: string[] | null;
  preferred_price_range: { min: number; max: number; hourly: boolean } | null;
  preferred_location: { radius: number; unit: string; coordinates: { latitude: number; longitude: number } | null } | null;
  updated_at: string;
}

export class AdvancedSearchService {
  private static searchCache = new Map<string, { data: unknown; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Search contractors with advanced filters
   */
  static async searchContractors(
    query: SearchQuery,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<ContractorSearchResult>> {
    const startTimer = performanceMonitor.startTimer('advanced_search_contractors');

    try {
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
        startTimer();
        return cached as SearchResult<ContractorSearchResult>;
      }

      const result = await handleDatabaseOperation(async () => {
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
          // SECURITY: Sanitize user input before interpolation to prevent SQL injection
          const sanitizedText = sanitizeForSQL(query.text);
          queryBuilder = queryBuilder.or(
            `bio.ilike.%${sanitizedText}%,skills.cs.{${sanitizedText}},users.first_name.ilike.%${sanitizedText}%,users.last_name.ilike.%${sanitizedText}%`
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

      startTimer();
      return result;
    } catch (error) {
      startTimer();
      throw error;
    }
  }

  /**
   * Search jobs with advanced filters
   */
  static async searchJobs(
    query: SearchQuery,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<JobSearchResult>> {
    const startTimer = performanceMonitor.startTimer('advanced_search_jobs');

    try {
      const context = {
        service: 'AdvancedSearchService',
        method: 'searchJobs',
        params: { query, page, limit },
      };

      validateRequired(query, 'query', context);

      const cacheKey = this.generateCacheKey('jobs', query, page, limit);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        startTimer();
        return cached as SearchResult<JobSearchResult>;
      }

      const result = await handleDatabaseOperation(async () => {
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
          // SECURITY: Sanitize user input before interpolation to prevent SQL injection
          const sanitizedText = sanitizeForSQL(query.text);
          queryBuilder = queryBuilder.or(
            `title.ilike.%${sanitizedText}%,description.ilike.%${sanitizedText}%,skills_required.cs.{${sanitizedText}}`
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

      startTimer();
      return result;
    } catch (error) {
      startTimer();
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial input
   */
  static async getSearchSuggestions(
    input: string,
    type: 'contractors' | 'jobs' = 'contractors',
    limit: number = 5
  ): Promise<SearchSuggestion[]> {
    const startTimer = performanceMonitor.startTimer('search_suggestions');

    try {
      if (input.length < 2) {
        startTimer();
        return [];
      }

      const context = {
        service: 'AdvancedSearchService',
        method: 'getSearchSuggestions',
        params: { input, type, limit },
      };

      const suggestions: SearchSuggestion[] = [];

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
      const result = suggestions
        .sort((a, b) => (b.metadata?.count || 0) - (a.metadata?.count || 0))
        .slice(0, limit);

      startTimer();
      return result;
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      startTimer();
      return [];
    }
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
    const startTimer = performanceMonitor.startTimer('save_search_personalization');

    try {
      const context = {
        service: 'AdvancedSearchService',
        method: 'saveSearchPersonalization',
        params: { userId, personalization },
      };

      validateRequired(userId, 'userId', context);

      await handleDatabaseOperation(async () => {
        const result = await supabase
          .from('user_search_preferences')
          .upsert({
            user_id: userId,
            preferred_skills: personalization.preferredSkills || [],
            preferred_price_range: personalization.preferredPriceRange || null,
            preferred_location: personalization.preferredLocation || null,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        return result;
      }, context);

      startTimer();
    } catch (error) {
      startTimer();
      throw error;
    }
  }

  /**
   * Get user search personalization data
   */
  static async getSearchPersonalization(userId: string): Promise<SearchPersonalization | null> {
    const startTimer = performanceMonitor.startTimer('get_search_personalization');

    try {
      const context = {
        service: 'AdvancedSearchService',
        method: 'getSearchPersonalization',
        params: { userId },
      };

      validateRequired(userId, 'userId', context);

      const result = await handleDatabaseOperation(async () => {
        const queryResult = await supabase
          .from('user_search_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (queryResult.error || !queryResult.data) {
          return { data: null, error: null };
        }

        const data = queryResult.data as DatabaseUserSearchPreferenceRow;

        // Default location with proper type
        const defaultLocation: LocationRadius = {
          radius: 25,
          unit: 'miles',
          coordinates: null,
        };

        // Ensure preferred_location has the correct unit type
        const preferredLocation: LocationRadius = data.preferred_location
          ? {
              ...data.preferred_location,
              unit: (data.preferred_location.unit === 'kilometers' ? 'kilometers' : 'miles') as 'miles' | 'kilometers',
            }
          : defaultLocation;

        const personalization: SearchPersonalization = {
          userId,
          preferredSkills: data.preferred_skills || [],
          preferredPriceRange: data.preferred_price_range || { min: 0, max: 1000, hourly: true },
          preferredLocation,
          searchHistory: [], // Would be loaded separately
          bookmarkedContractors: [], // Would be loaded separately
          contactedContractors: [], // Would be loaded separately
        };

        return { data: personalization, error: null };
      }, context);

      startTimer();
      return result;
    } catch (error) {
      startTimer();
      throw error;
    }
  }

  // Private helper methods

  private static applyContractorFilters(
    queryBuilder: PostgrestFilterBuilder<any, any, any>,
    filters: SearchFilters
  ): PostgrestFilterBuilder<any, any, any> {
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

  private static applyContractorSorting(
    queryBuilder: PostgrestFilterBuilder<any, any, any>,
    sortBy: string
  ): PostgrestFilterBuilder<any, any, any> {
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

  private static applyJobFilters(
    queryBuilder: PostgrestFilterBuilder<any, any, any>,
    filters: SearchFilters
  ): PostgrestFilterBuilder<any, any, any> {
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

  private static applyJobSorting(
    queryBuilder: PostgrestFilterBuilder<any, any, any>,
    sortBy: string
  ): PostgrestFilterBuilder<any, any, any> {
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
    data: DatabaseContractorProfileRow[],
    userLocation: { latitude: number; longitude: number } | null
  ): ContractorSearchResult[] {
    return data.map((item) => ({
      id: item.id,
      name: item.users ? `${item.users.first_name} ${item.users.last_name}` : 'Unknown',
      profileImage: item.users?.profile_image_url || undefined,
      skills: item.skills || [],
      rating: item.rating || 0,
      reviewCount: item.review_count || 0,
      hourlyRate: item.hourly_rate || undefined,
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
    data: DatabaseJobRow[],
    userLocation: { latitude: number; longitude: number } | null
  ): JobSearchResult[] {
    return data.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      budget: {
        min: item.budget_min || undefined,
        max: item.budget_max || undefined,
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
      projectType: item.project_type as ProjectType,
      homeowner: {
        name: item.users ? `${item.users.first_name} ${item.users.last_name}` : 'Unknown',
        rating: item.users?.homeowner_rating || 0,
        reviewCount: item.users?.homeowner_reviews || 0,
      },
      matchScore: 80,
    }));
  }

  private static async getContractorCount(query: SearchQuery): Promise<{ count: number }> {
    let queryBuilder = supabase
      .from('contractor_profiles')
      .select('id', { count: 'exact', head: true });

    if (query.text.trim()) {
      // SECURITY: Sanitize user input before interpolation to prevent SQL injection
      const sanitizedText = sanitizeForSQL(query.text);
      queryBuilder = queryBuilder.or(
        `bio.ilike.%${sanitizedText}%,skills.cs.{${sanitizedText}}`
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
      // SECURITY: Sanitize user input before interpolation to prevent SQL injection
      const sanitizedText = sanitizeForSQL(query.text);
      queryBuilder = queryBuilder.or(
        `title.ilike.%${sanitizedText}%,description.ilike.%${sanitizedText}%`
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

  private static getFromCache(key: string): unknown {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.searchCache.delete(key);
    }
    return null;
  }

  private static setCache(key: string, data: unknown): void {
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