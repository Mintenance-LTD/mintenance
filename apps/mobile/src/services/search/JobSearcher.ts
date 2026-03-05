import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { handleDatabaseOperation, validateRequired } from '../../utils/serviceHelper';
import { performanceMonitor } from '../../utils/performance';
import { sanitizeForSQL } from '../../utils/sqlSanitization';
import type { SearchQuery, SearchResult, JobSearchResult, SearchFacets } from '../../types/search';
import type { ProjectType } from '../../types/search';
import { generateCacheKey, getFromCache, setCache } from './SearchCache';
import { calculateDistance, type QueryBuilder, type DatabaseJobRow } from './types';

function applyJobFilters(queryBuilder: QueryBuilder, filters: SearchQuery['filters']): QueryBuilder {
  if (filters.skills.length > 0) {
    queryBuilder = queryBuilder.overlaps('skills_required', filters.skills);
  }
  if (filters.projectType.length > 0) {
    queryBuilder = queryBuilder.in('project_type', filters.projectType);
  }
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

function applyJobSorting(queryBuilder: QueryBuilder, sortBy: string): QueryBuilder {
  switch (sortBy) {
    case 'price_high': return queryBuilder.order('budget_max', { ascending: false });
    case 'price_low':  return queryBuilder.order('budget_min', { ascending: true });
    default:           return queryBuilder.order('created_at', { ascending: false });
  }
}

function transformJobResults(
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
        ? calculateDistance(userLocation, item.location_coordinates) : 0,
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

async function getJobCount(query: SearchQuery): Promise<{ count: number }> {
  let queryBuilder = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'posted');

  if (query.text.trim()) {
    const sanitizedText = sanitizeForSQL(query.text);
    queryBuilder = queryBuilder.or(
      `title.ilike.%${sanitizedText}%,description.ilike.%${sanitizedText}%`
    );
  }

  queryBuilder = applyJobFilters(queryBuilder, query.filters);
  const result = await queryBuilder;
  return { count: result.count || 0 };
}

async function generateJobFacets(_query: SearchQuery): Promise<SearchFacets> {
  return { skills: [], projectTypes: [], priceRanges: [], ratings: [], locations: [] };
}

export async function searchJobs(
  query: SearchQuery,
  page: number = 1,
  limit: number = 20
): Promise<SearchResult<JobSearchResult>> {
  const startTimer = performanceMonitor.startTimer('advanced_search_jobs');

  try {
    const context = {
      service: 'AdvancedSearchService', method: 'searchJobs',
      params: { query, page, limit },
    };
    validateRequired(query, 'query', context);

    const cacheKey = generateCacheKey('jobs', query, page, limit);
    const cached = getFromCache(cacheKey);
    if (cached) {
      startTimer();
      return cached as SearchResult<JobSearchResult>;
    }

    const result = await handleDatabaseOperation(async () => {
      const startTime = Date.now();

      let queryBuilder = supabase
        .from('jobs')
        .select(`id,title,description,budget_min,budget_max,budget_type,
          location_city,location_state,location_coordinates,created_at,urgency,
          skills_required,project_type,status,
          users!inner(first_name,last_name,rating as homeowner_rating,review_count as homeowner_reviews)`)
        .eq('status', 'posted');

      if (query.text.trim()) {
        const sanitizedText = sanitizeForSQL(query.text);
        queryBuilder = queryBuilder.or(
          `title.ilike.%${sanitizedText}%,description.ilike.%${sanitizedText}%,skills_required.cs.{${sanitizedText}}`
        );
      }

      queryBuilder = applyJobFilters(queryBuilder, query.filters);
      queryBuilder = applyJobSorting(queryBuilder, query.filters.sortBy);
      queryBuilder = queryBuilder.range((page - 1) * limit, page * limit - 1);

      const res = await queryBuilder;
      if (res.error) throw new Error(`Job search failed: ${res.error.message}`);

      const jobs = transformJobResults(res.data || [], query.filters.location.coordinates);
      const countResult = await getJobCount(query);
      const facets = await generateJobFacets(query);

      const searchResult: SearchResult<JobSearchResult> = {
        items: jobs,
        total: countResult.count || 0,
        page,
        limit,
        hasMore: jobs.length === limit && (page * limit) < (countResult.count || 0),
        facets,
        query,
        executionTime: Date.now() - startTime,
      };

      setCache(cacheKey, searchResult);
      return { data: searchResult, error: null };
    }, context);

    startTimer();
    return result;
  } catch (error) {
    startTimer();
    throw error;
  }
}
