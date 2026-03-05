import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { handleDatabaseOperation, validateRequired } from '../../utils/serviceHelper';
import { performanceMonitor } from '../../utils/performance';
import { sanitizeForSQL } from '../../utils/sqlSanitization';
import type { SearchQuery, SearchResult, ContractorSearchResult, SearchFacets } from '../../types/search';
import { generateCacheKey, getFromCache, setCache } from './SearchCache';
import { calculateDistance, type QueryBuilder, type DatabaseContractorProfileRow } from './types';

function applyContractorFilters(queryBuilder: QueryBuilder, filters: SearchQuery['filters']): QueryBuilder {
  if (filters.skills.length > 0) {
    queryBuilder = queryBuilder.overlaps('skills', filters.skills);
  }
  if (filters.rating > 0) {
    queryBuilder = queryBuilder.gte('rating', filters.rating);
  }
  if (filters.priceRange.min > 0 || filters.priceRange.max < 1000) {
    if (filters.priceRange.hourly) {
      queryBuilder = queryBuilder
        .gte('hourly_rate', filters.priceRange.min)
        .lte('hourly_rate', filters.priceRange.max);
    }
  }
  if (filters.verified) {
    queryBuilder = queryBuilder.eq('verified', true);
  }
  if (filters.hasReviews) {
    queryBuilder = queryBuilder.gt('review_count', 0);
  }
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

function applyContractorSorting(queryBuilder: QueryBuilder, sortBy: string): QueryBuilder {
  switch (sortBy) {
    case 'rating':    return queryBuilder.order('rating', { ascending: false });
    case 'price_low': return queryBuilder.order('hourly_rate', { ascending: true });
    case 'price_high': return queryBuilder.order('hourly_rate', { ascending: false });
    case 'reviews':   return queryBuilder.order('review_count', { ascending: false });
    default:          return queryBuilder.order('rating', { ascending: false });
  }
}

function transformContractorResults(
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
        ? calculateDistance(userLocation, item.location_coordinates) : 0,
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
    matchScore: 85,
  }));
}

async function getContractorCount(query: SearchQuery): Promise<{ count: number }> {
  let queryBuilder = supabase
    .from('contractor_profiles')
    .select('id', { count: 'exact', head: true });

  if (query.text.trim()) {
    const sanitizedText = sanitizeForSQL(query.text);
    queryBuilder = queryBuilder.or(`bio.ilike.%${sanitizedText}%,skills.cs.{${sanitizedText}}`);
  }

  queryBuilder = applyContractorFilters(queryBuilder, query.filters);
  const result = await queryBuilder;
  return { count: result.count || 0 };
}

async function generateContractorFacets(_query: SearchQuery): Promise<SearchFacets> {
  return { skills: [], projectTypes: [], priceRanges: [], ratings: [], locations: [] };
}

export async function searchContractors(
  query: SearchQuery,
  page: number = 1,
  limit: number = 20
): Promise<SearchResult<ContractorSearchResult>> {
  const startTimer = performanceMonitor.startTimer('advanced_search_contractors');

  try {
    const context = {
      service: 'AdvancedSearchService', method: 'searchContractors',
      params: { query, page, limit },
    };
    validateRequired(query, 'query', context);

    const cacheKey = generateCacheKey('contractors', query, page, limit);
    const cached = getFromCache(cacheKey);
    if (cached) {
      startTimer();
      return cached as SearchResult<ContractorSearchResult>;
    }

    const result = await handleDatabaseOperation(async () => {
      const startTime = Date.now();

      let queryBuilder = supabase
        .from('contractor_profiles')
        .select(`id,user_id,bio,skills,hourly_rate,rating,review_count,verified,
          location_city,location_state,location_coordinates,
          availability_immediate,availability_this_week,availability_this_month,
          completed_jobs,response_time,users!inner(first_name,last_name,profile_image_url)`);

      if (query.text.trim()) {
        const sanitizedText = sanitizeForSQL(query.text);
        queryBuilder = queryBuilder.or(
          `bio.ilike.%${sanitizedText}%,skills.cs.{${sanitizedText}},users.first_name.ilike.%${sanitizedText}%,users.last_name.ilike.%${sanitizedText}%`
        );
      }

      queryBuilder = applyContractorFilters(queryBuilder, query.filters);
      queryBuilder = applyContractorSorting(queryBuilder, query.filters.sortBy);
      queryBuilder = queryBuilder.range((page - 1) * limit, page * limit - 1);

      const res = await queryBuilder;
      if (res.error) throw new Error(`Search failed: ${res.error.message}`);

      const contractors = transformContractorResults(
        res.data || [],
        query.filters.location.coordinates
      );
      const countResult = await getContractorCount(query);
      const facets = await generateContractorFacets(query);

      const searchResult: SearchResult<ContractorSearchResult> = {
        items: contractors,
        total: countResult.count || 0,
        page,
        limit,
        hasMore: contractors.length === limit && (page * limit) < (countResult.count || 0),
        facets,
        query,
        executionTime: Date.now() - startTime,
      };

      setCache(cacheKey, searchResult);
      logger.info('Contractor search completed', {
        resultsCount: contractors.length, totalResults: countResult.count,
        executionTime: searchResult.executionTime,
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
