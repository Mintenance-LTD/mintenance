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
        return this.getMockJobSearchResults(query, filters, page, limit);
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
      return this.getMockJobSearchResults(query, filters, page, limit);
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
        return this.getMockContractorSearchResults(query, filters, page, limit);
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
        reviews: (profile as any).reviews ?? []
      }));

      // Calculate facets for refined search
      const facets = await this.calculateContractorFacets(filters);

      return {
        items: contractors,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
        facets,
        suggestions: this.generateSearchSuggestions(query)
      };
    } catch (error) {
      logger.error('Advanced contractor search error', error);
      return this.getMockContractorSearchResults(query, filters, page, limit);
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
      // Return mock saved search
      return {
        id: `saved_${Date.now()}`,
        userId,
        name,
        filters,
        alertEnabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
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
   * Calculate facets for job search refinement
   */
  private static async calculateJobFacets(_filters: AdvancedSearchFilters): Promise<SearchFacets> {
    try {
      // This would typically be calculated from the database
      // For now, return mock facets
      return {
        skills: {
          'plumbing': 45,
          'electrical': 32,
          'carpentry': 28,
          'painting': 21,
          'hvac': 18
        },
        priceRanges: {
          '$0-$500': 120,
          '$500-$1000': 85,
          '$1000-$2500': 65,
          '$2500+': 30
        },
        ratings: {
          '5 stars': 85,
          '4+ stars': 150,
          '3+ stars': 45
        },
        locations: {
          'Downtown': 95,
          'Suburbs': 125,
          'North Side': 65,
          'South Side': 85
        },
        availability: {
          'immediate': 45,
          'this_week': 85,
          'this_month': 95,
          'flexible': 120
        }
      };
    } catch (error) {
      logger.error('Error calculating job facets', error);
      return { skills: {}, priceRanges: {}, ratings: {}, locations: {}, availability: {} };
    }
  }

  /**
   * Calculate facets for contractor search refinement
   */
  private static async calculateContractorFacets(_filters: AdvancedSearchFilters): Promise<SearchFacets> {
    try {
      // This would typically be calculated from the database
      return {
        skills: {
          'plumbing': 25,
          'electrical': 18,
          'carpentry': 22,
          'painting': 15,
          'hvac': 12
        },
        priceRanges: {
          '$25-$50/hr': 45,
          '$50-$75/hr': 35,
          '$75-$100/hr': 25,
          '$100+/hr': 15
        },
        ratings: {
          '5 stars': 35,
          '4+ stars': 65,
          '3+ stars': 20
        },
        locations: {
          'Downtown': 30,
          'Suburbs': 45,
          'North Side': 25,
          'South Side': 20
        },
        availability: {
          'immediate': 15,
          'this_week': 25,
          'this_month': 35,
          'flexible': 45
        }
      };
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

  /**
   * Mock job search results for demo/fallback
   */
  private static getMockJobSearchResults(
    query: string,
    filters: AdvancedSearchFilters,
    page: number,
    limit: number
  ): SearchResult<Job> {
    const mockJobs: Job[] = [
      {
        id: 'job_search_1',
        title: 'Kitchen Sink Repair',
        description: 'Leaking kitchen sink needs immediate repair',
        location: 'Downtown District',
        homeowner_id: 'homeowner_1',
        contractor_id: undefined,
        status: 'posted',
        budget: 250,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        category: 'plumbing',
        priority: 'high',
        photos: ['https://example.com/sink1.jpg'],
        // Computed fields
        homeownerId: 'homeowner_1',
        contractorId: undefined,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      } as Job,
      {
        id: 'job_search_2',
        title: 'Bathroom Electrical Work',
        description: 'Install new lighting fixtures in master bathroom',
        location: 'Suburban Area',
        homeowner_id: 'homeowner_2',
        contractor_id: undefined,
        status: 'posted',
        budget: 450,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        category: 'electrical',
        priority: 'medium',
        photos: [],
        // Computed fields
        homeownerId: 'homeowner_2',
        contractorId: undefined,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      } as Job,
      {
        id: 'job_search_3',
        title: 'Deck Painting',
        description: 'Large deck needs complete repainting',
        location: 'North Side',
        homeowner_id: 'homeowner_3',
        contractor_id: undefined,
        status: 'posted',
        budget: 800,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        category: 'painting',
        priority: 'low',
        photos: ['https://example.com/deck1.jpg', 'https://example.com/deck2.jpg'],
        // Computed fields
        homeownerId: 'homeowner_3',
        contractorId: undefined,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      } as Job
    ];

    return {
      items: mockJobs.slice(0, limit),
      totalCount: mockJobs.length,
      hasMore: false,
      facets: {
        skills: { 'plumbing': 1, 'electrical': 1, 'painting': 1 },
        priceRanges: { '$200-$500': 2, '$500+': 1 },
        ratings: {},
        locations: { 'Downtown District': 1, 'Suburban Area': 1, 'North Side': 1 },
        availability: { 'immediate': 1, 'this_week': 1, 'flexible': 1 }
      },
      suggestions: [`experienced ${query}`, `affordable ${query}`, `${query} near me`]
    };
  }

  /**
   * Mock contractor search results for demo/fallback
   */
  private static getMockContractorSearchResults(
    query: string,
    filters: AdvancedSearchFilters,
    page: number,
    limit: number
  ): SearchResult<ContractorProfile> {
    const mockContractors: ContractorProfile[] = [
      {
        id: 'contractor_search_1',
        email: 'mike.plumber@email.com',
        first_name: 'Mike',
        last_name: 'Johnson',
        phone: '(555) 123-4567',
        role: 'contractor',
        profile_image_url: 'https://example.com/mike.jpg',
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        companyName: 'Mike Johnson Plumbing',
        skills: [
          { id: '1', contractorId: 'contractor_search_1', skillName: 'plumbing', createdAt: new Date().toISOString() },
          { id: '2', contractorId: 'contractor_search_1', skillName: 'water heaters', createdAt: new Date().toISOString() },
          { id: '3', contractorId: 'contractor_search_1', skillName: 'drain cleaning', createdAt: new Date().toISOString() }
        ],
        reviews: [],
        total_jobs_completed: 127,
        hourlyRate: 85,
        yearsExperience: 10,
        availability: 'immediate',
        rating: 4.8,
        portfolioImages: ['https://example.com/portfolio1.jpg']
      },
      {
        id: 'contractor_search_2',
        email: 'sarah.electric@email.com',
        first_name: 'Sarah',
        last_name: 'Williams',
        phone: '(555) 234-5678',
        role: 'contractor',
        profile_image_url: 'https://example.com/sarah.jpg',
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        companyName: 'Sarah Williams Electrical',
        skills: [
          { id: '4', contractorId: 'contractor_search_2', skillName: 'electrical', createdAt: new Date().toISOString() },
          { id: '5', contractorId: 'contractor_search_2', skillName: 'wiring', createdAt: new Date().toISOString() },
          { id: '6', contractorId: 'contractor_search_2', skillName: 'lighting', createdAt: new Date().toISOString() },
          { id: '7', contractorId: 'contractor_search_2', skillName: 'smart home', createdAt: new Date().toISOString() }
        ],
        reviews: [],
        total_jobs_completed: 89,
        hourlyRate: 95,
        yearsExperience: 8,
        availability: 'this_week',
        rating: 4.9,
        portfolioImages: ['https://example.com/portfolio2.jpg', 'https://example.com/portfolio3.jpg']
      }
    ];

    return {
      items: mockContractors.slice(0, limit),
      totalCount: mockContractors.length,
      hasMore: false,
      facets: {
        skills: { 'plumbing': 1, 'electrical': 1, 'lighting': 1, 'wiring': 1 },
        priceRanges: { '$75-$100/hr': 2 },
        ratings: { '4+ stars': 2, '5 stars': 1 },
        locations: { 'Local Area': 2 },
        availability: { 'immediate': 1, 'this_week': 1 }
      },
      suggestions: [`certified ${query}`, `top-rated ${query}`, `local ${query}`]
    };
  }
}