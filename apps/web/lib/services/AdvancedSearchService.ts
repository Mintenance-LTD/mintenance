import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { sanitizeForSQL } from '@/lib/sanitizer';
import type {
  AdvancedSearchFilters,
  SearchResult,
  SearchFacets,
  SavedSearch,
  SearchAnalytics,
  Job,
  ContractorProfile
} from '@mintenance/types';

export class AdvancedSearchService {

  /**
   * Perform advanced search for jobs with comprehensive filtering
   */
  static async searchJobs(
    query: string,
    filters: AdvancedSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<Job>> {
    try {
      const offset = (page - 1) * limit;

      // Build the query with filters
      let supabaseQuery = supabase
        .from('jobs')
        .select('*', { count: 'exact' });

      // Text search
      if (query.trim()) {
        // SECURITY: Sanitize user input before interpolation to prevent SQL injection
        const sanitizedQuery = sanitizeForSQL(query);
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`
        );
      }

      // Price range filtering
      if (filters.priceRange) {
        supabaseQuery = supabaseQuery
          .gte('budget', filters.priceRange.min)
          .lte('budget', filters.priceRange.max);
      }

      // Status filtering based on availability/urgency
      if (filters.urgency) {
        switch (filters.urgency) {
          case 'emergency':
            supabaseQuery = supabaseQuery.eq('priority', 'high');
            break;
          case 'urgent':
            supabaseQuery = supabaseQuery.in('priority', ['high', 'medium']);
            break;
          case 'normal':
            supabaseQuery = supabaseQuery.eq('priority', 'medium');
            break;
          case 'flexible':
            supabaseQuery = supabaseQuery.eq('priority', 'low');
            break;
        }
      }

      // Project type filtering
      if (filters.projectTypes.length > 0) {
        supabaseQuery = supabaseQuery.in('category', filters.projectTypes);
      }

      // Status filtering
      supabaseQuery = supabaseQuery.eq('status', 'posted');

      // Apply pagination
      supabaseQuery = supabaseQuery
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const { data, error, count } = await supabaseQuery;

      if (error) {
        logger.error('Error searching jobs', error);
        return { items: [], totalCount: 0, hasMore: false, facets: { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} }, suggestions: [] };
      }

      // Calculate facets for refined search
      const facets = await this.calculateJobFacets(filters);

      return {
        items: data || [],
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
        facets,
        suggestions: this.generateSearchSuggestions(query)
      };
    } catch (error) {
      logger.error('Advanced job search error', error);
      return { items: [], totalCount: 0, hasMore: false, facets: { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} }, suggestions: [] };
    }
  }

  /**
   * Perform advanced search for contractors with sophisticated matching
   */
  static async searchContractors(
    query: string,
    filters: AdvancedSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<ContractorProfile>> {
    try {
      const offset = (page - 1) * limit;

      // Build the query with filters
      let supabaseQuery = supabase
        .from('contractor_profiles')
        .select(`
          *,
          user:users!contractor_profiles_user_id_fkey(
            id, email, first_name, last_name, phone, avatar_url
          )
        `, { count: 'exact' });

      // Text search across multiple fields
      if (query.trim()) {
        // SECURITY: Sanitize user input before interpolation to prevent SQL injection
        const sanitizedQuery = sanitizeForSQL(query);
        supabaseQuery = supabaseQuery.or(
          `bio.ilike.%${sanitizedQuery}%,skills.cs.{${sanitizedQuery}}`
        );
      }

      // Skills filtering
      if (filters.skills.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('skills', filters.skills);
      }

      // Hourly rate filtering (price range)
      if (filters.priceRange) {
        supabaseQuery = supabaseQuery
          .gte('hourly_rate', filters.priceRange.min)
          .lte('hourly_rate', filters.priceRange.max);
      }

      // Availability filtering
      if (filters.availability !== 'flexible') {
        supabaseQuery = supabaseQuery.eq('availability', filters.availability);
      }

      // Insurance and background check filtering
      if (filters.hasInsurance !== undefined) {
        supabaseQuery = supabaseQuery.eq('has_insurance', filters.hasInsurance);
      }

      if (filters.isBackgroundChecked !== undefined) {
        supabaseQuery = supabaseQuery.eq('background_checked', filters.isBackgroundChecked);
      }

      // Apply pagination
      supabaseQuery = supabaseQuery
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const { data, error, count } = await supabaseQuery;

      if (error) {
        logger.error('Error searching contractors', error);
        return { items: [], totalCount: 0, hasMore: false, facets: { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} }, suggestions: [] };
      }

      // Transform data to match Contractor interface
      const contractors = (data || []).map(profile => ({
        id: profile.user?.id || '',
        email: profile.user?.email || '',
        first_name: profile.user?.first_name || '',
        last_name: profile.user?.last_name || '',
        phone: profile.user?.phone || '',
        role: 'contractor' as const,
        avatar_url: profile.user?.avatar_url || '',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        // Contractor-specific fields
        bio: profile.bio || '',
        skills: profile.skills || [],
        hourly_rate: profile.hourly_rate || 0,
        experience_years: profile.experience_years || 0,
        availability: profile.availability || 'flexible',
        rating: profile.rating || 0,
        total_jobs: profile.total_jobs || 0,
        portfolioImages: profile.portfolio_images || [],
        reviews: ((profile as Record<string, unknown>).reviews ?? []) as ContractorProfile['reviews']
      }));

      // Calculate facets for refined search
      const facets = await this.calculateContractorFacets(filters);

      return {
        items: contractors as ContractorProfile[],
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
        facets,
        suggestions: this.generateSearchSuggestions(query)
      };
    } catch (error) {
      logger.error('Advanced contractor search error', error);
      return { items: [], totalCount: 0, hasMore: false, facets: { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} }, suggestions: [] };
    }
  }

  /**
   * Save a search for future use and alerts
   */
  static async saveSearch(
    userId: string,
    name: string,
    filters: AdvancedSearchFilters,
    alertEnabled: boolean = false
  ): Promise<SavedSearch> {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert([{
          user_id: userId,
          name,
          filters,
          alert_enabled: alertEnabled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error saving search', error);
        throw new Error('Failed to save search');
      }

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        filters: data.filters,
        alertEnabled: data.alert_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      logger.error('Save search error', error);
      throw new Error('Failed to save search');
    }
  }

  /**
   * Get user's saved searches
   */
  static async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Error fetching saved searches', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        filters: item.filters,
        alertEnabled: item.alert_enabled,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      logger.error('Get saved searches error', error);
      return [];
    }
  }

  /**
   * Track search analytics for insights
   */
  static async trackSearchAnalytics(
    userId: string,
    searchQuery: string,
    filters: AdvancedSearchFilters,
    resultsCount: number,
    sessionId: string
  ): Promise<void> {
    try {
      const analytics: SearchAnalytics = {
        userId,
        searchQuery,
        filters,
        resultsCount,
        clickedResults: [],
        timestamp: new Date().toISOString(),
        sessionId
      };

      // In a real implementation, this would be sent to an analytics service
      logger.info('Search Analytics', analytics);

      // Could also store in Supabase for later analysis
      await supabase
        .from('search_analytics')
        .insert([{
          user_id: analytics.userId,
          search_query: analytics.searchQuery,
          filters: analytics.filters,
          results_count: analytics.resultsCount,
          session_id: analytics.sessionId,
          timestamp: analytics.timestamp
        }]);
    } catch (error) {
      logger.error('Search analytics tracking error', error);
      // Analytics failures shouldn't break the search experience
    }
  }

  /**
   * Calculate facets for job search refinement from actual DB data
   */
  private static async calculateJobFacets(_filters: AdvancedSearchFilters): Promise<SearchFacets> {
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('category, budget, priority')
        .eq('status', 'posted');

      if (error || !jobs) {
        return { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} };
      }

      const skills: Record<string, number> = {};
      const priceRanges: Record<string, number> = {
        '$0-$500': 0, '$500-$1000': 0, '$1000-$2500': 0, '$2500+': 0,
      };

      for (const job of jobs) {
        if (job.category) {
          skills[job.category] = (skills[job.category] || 0) + 1;
        }
        const budget = job.budget || 0;
        if (budget <= 500) priceRanges['$0-$500']++;
        else if (budget <= 1000) priceRanges['$500-$1000']++;
        else if (budget <= 2500) priceRanges['$1000-$2500']++;
        else priceRanges['$2500+']++;
      }

      return { skills, priceRanges, ratings: {}, locations: {}, availability: {} };
    } catch (error) {
      logger.error('Error calculating job facets', error);
      return { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} };
    }
  }

  /**
   * Calculate facets for contractor search refinement from actual DB data
   */
  private static async calculateContractorFacets(_filters: AdvancedSearchFilters): Promise<SearchFacets> {
    try {
      const { data: contractors, error } = await supabase
        .from('contractor_profiles')
        .select('skills, hourly_rate, rating, availability');

      if (error || !contractors) {
        return { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} };
      }

      const skills: Record<string, number> = {};
      const priceRanges: Record<string, number> = {
        '$25-$50/hr': 0, '$50-$75/hr': 0, '$75-$100/hr': 0, '$100+/hr': 0,
      };
      const ratings: Record<string, number> = {
        '5 stars': 0, '4+ stars': 0, '3+ stars': 0,
      };
      const availability: Record<string, number> = {};

      for (const c of contractors) {
        if (Array.isArray(c.skills)) {
          for (const skill of c.skills) {
            const s = typeof skill === 'string' ? skill : '';
            if (s) skills[s] = (skills[s] || 0) + 1;
          }
        }
        const rate = c.hourly_rate || 0;
        if (rate <= 50) priceRanges['$25-$50/hr']++;
        else if (rate <= 75) priceRanges['$50-$75/hr']++;
        else if (rate <= 100) priceRanges['$75-$100/hr']++;
        else priceRanges['$100+/hr']++;

        const r = c.rating || 0;
        if (r === 5) ratings['5 stars']++;
        if (r >= 4) ratings['4+ stars']++;
        if (r >= 3) ratings['3+ stars']++;

        if (c.availability) {
          availability[c.availability] = (availability[c.availability] || 0) + 1;
        }
      }

      return { skills, priceRanges, ratings, locations: {}, availability };
    } catch (error) {
      logger.error('Error calculating contractor facets', error);
      return { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} };
    }
  }

  /**
   * Generate search suggestions based on query and results
   */
  private static generateSearchSuggestions(query: string): string[] {
    const suggestions = [
      `${query} near me`,
      `experienced ${query}`,
      `affordable ${query}`,
      `emergency ${query}`,
      `licensed ${query}`
    ].filter(suggestion => suggestion.toLowerCase() !== query.toLowerCase());

    return suggestions.slice(0, 3);
  }

}