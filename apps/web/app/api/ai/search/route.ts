import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { rateLimiter, checkAIUserRateLimit } from '@/lib/rate-limiter';
import { sanitizeText } from '@/lib/sanitizer';
import type { SearchFilters } from '@mintenance/ai-core';

interface SearchResult {
  id: string;
  type: 'job' | 'contractor';
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
}

/**
 * AI-powered semantic search endpoint
 * OWASP Security: Rate limited to 10 requests per minute per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - OWASP best practice: limit expensive AI operations
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `ai-search:${identifier}`,
      windowMs: 60000, // 1 minute
      maxRequests: 10, // 10 requests per minute (expensive AI calls)
    });

    if (!rateLimitResult.allowed) {
      logger.warn('AI search rate limit exceeded', {
        service: 'ai_search',
        identifier,
        remaining: rateLimitResult.remaining,
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    // CSRF protection
    await requireCSRF(request);

    // Per-user rate limit if authenticated
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userRateLimit = await checkAIUserRateLimit(user.id);
        if (!userRateLimit.allowed) {
          logger.warn('AI search per-user rate limit exceeded', {
            service: 'ai_search',
            userId: user.id,
          });
          return NextResponse.json(
            { error: 'You have exceeded your AI request limit. Please try again shortly.' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '3',
                'X-RateLimit-Remaining': String(userRateLimit.remaining),
                'X-RateLimit-Reset': String(Math.ceil(userRateLimit.resetTime / 1000)),
                'Retry-After': String(userRateLimit.retryAfter || 60),
              },
            }
          );
        }
      }
    } catch {
      // Auth check is best-effort for rate limiting; don't block search if auth fails
    }

    const { query, filters, limit = 20 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query with timeout protection
    let usedFallback = false;
    let jobResults: SearchResult[] = [];
    let contractorResults: SearchResult[] = [];

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      // Add timeout protection to embedding generation
      const controller = new AbortController();
      const timeoutMs = 5000; // 5 seconds
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const embeddingResponse = await fetch(`${apiBaseUrl}/api/ai/generate-embedding`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: query.trim(),
            model: 'text-embedding-3-small',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!embeddingResponse.ok) {
          throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
        }

        const { embedding } = await embeddingResponse.json();

        // Search jobs and contractors in parallel using semantic search
        [jobResults, contractorResults] = await Promise.all([
          searchJobs(embedding, filters, limit),
          searchContractors(embedding, filters, limit),
        ]);

        logger.info('Semantic search completed successfully', {
          service: 'ai_search',
          query: query.substring(0, 100),
          resultsCount: jobResults.length + contractorResults.length,
        });

      } catch (embeddingError) {
        clearTimeout(timeout);
        const error = embeddingError as Error;

        // Handle timeout or embedding generation failure
        if (error.name === 'AbortError') {
          logger.warn('Embedding generation timeout, falling back to full-text search', {
            service: 'ai_search',
            query: query.substring(0, 100),
            timeoutMs,
          });
        } else {
          logger.warn('Embedding generation failed, falling back to full-text search', {
            service: 'ai_search',
            query: query.substring(0, 100),
            error: error.message,
          });
        }

        // Fallback to full-text search
        usedFallback = true;
        [jobResults, contractorResults] = await Promise.all([
          fullTextSearchJobs(query, filters, limit),
          fullTextSearchContractors(query, filters, limit),
        ]);
      }
    } catch (searchError) {
      // If even fallback fails, use empty results
      logger.error('Search failed completely', searchError, {
        service: 'ai_search',
        query: query.substring(0, 100),
      });
      jobResults = [];
      contractorResults = [];
    }

    // Combine and rank results
    const allResults = [...jobResults, ...contractorResults];
    const rankedResults = rankResults(allResults, query);

    // Apply additional filters
    const filteredResults = applyFilters(rankedResults, filters);

    // Log search analytics with fallback information
    await logSearchAnalytics({
      query,
      resultsCount: filteredResults.length,
      clickThroughRate: 0,
      averageRelevanceScore: calculateAverageRelevance(filteredResults),
      searchTime: 0,
      filters,
      usedFallback,
      searchMethod: usedFallback ? 'full-text' : 'semantic',
    });

    return NextResponse.json({
      results: filteredResults.slice(0, limit),
      count: filteredResults.length,
      usedFallback,
      searchMethod: usedFallback ? 'full-text' : 'semantic',
    });
  } catch (error) {
    logger.error('Search API error', error, {
      service: 'ai_search',
    });
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

/**
 * Full-text search fallback for jobs when semantic search fails
 * Uses PostgreSQL built-in text search capabilities
 */
async function fullTextSearchJobs(
  query: string,
  filters: SearchFilters,
  limit: number
): Promise<SearchResult[]> {
  try {
    // SECURITY: Sanitize search query to prevent PostgREST filter injection
    const sanitizedQuery = query
      .replace(/[^a-zA-Z0-9\s\-']/g, '')
      .substring(0, 200)
      .trim();

    if (!sanitizedQuery) return [];

    // Build the query
    let queryBuilder = serverSupabase
      .from('jobs')
      .select('*')
      .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
      .limit(limit);

    // Apply filters
    if (filters.category) {
      queryBuilder = queryBuilder.eq('category', filters.category);
    }
    if (filters.location) {
      queryBuilder = queryBuilder.ilike('location', `%${filters.location}%`);
    }
    if (filters.priceRange?.min !== undefined) {
      queryBuilder = queryBuilder.gte('budget', filters.priceRange.min);
    }
    if (filters.priceRange?.max !== undefined) {
      queryBuilder = queryBuilder.lte('budget', filters.priceRange.max);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      logger.warn('Full-text job search error', {
        service: 'ai_search',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    return (data || []).map((job: Record<string, unknown>) => ({
      id: String(job.id || ''),
      type: 'job' as const,
      title: String(job.title || ''),
      description: String(job.description || ''),
      relevanceScore: calculateTextMatchScore(query, job),
      metadata: {
        location: typeof job.location === 'string' ? job.location : undefined,
        category: typeof job.category === 'string' ? job.category : undefined,
        price: typeof job.budget === 'number' ? job.budget : undefined,
        availability: typeof job.status === 'string' ? job.status : undefined,
      },
    }));
  } catch (error) {
    logger.error('Failed to perform full-text job search', error, {
      service: 'ai_search',
    });
    return [];
  }
}

/**
 * Full-text search fallback for contractors when semantic search fails
 */
async function fullTextSearchContractors(
  query: string,
  filters: SearchFilters,
  limit: number
): Promise<SearchResult[]> {
  try {
    // SECURITY: Sanitize search query to prevent PostgREST filter injection
    const sanitizedQuery = query
      .replace(/[^a-zA-Z0-9\s\-']/g, '')
      .substring(0, 200)
      .trim();

    if (!sanitizedQuery) return [];

    // Build the query
    let queryBuilder = serverSupabase
      .from('profiles')
      .select('*')
      .eq('role', 'contractor')
      .or(`first_name.ilike.%${sanitizedQuery}%,last_name.ilike.%${sanitizedQuery}%,bio.ilike.%${sanitizedQuery}%`)
      .limit(limit);

    // Apply filters
    if (filters.location) {
      queryBuilder = queryBuilder.ilike('location', `%${filters.location}%`);
    }
    if (filters.rating !== undefined) {
      queryBuilder = queryBuilder.gte('rating', filters.rating);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      logger.warn('Full-text contractor search error', {
        service: 'ai_search',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    return (data || []).map((contractor: Record<string, unknown>) => {
      const firstName = typeof contractor.first_name === 'string' ? contractor.first_name : '';
      const lastName = typeof contractor.last_name === 'string' ? contractor.last_name : '';
      const bio = typeof contractor.bio === 'string' ? contractor.bio : '';
      const location = typeof contractor.location === 'string' ? contractor.location : undefined;
      const rating = typeof contractor.rating === 'number' ? contractor.rating : undefined;
      const availability = typeof contractor.availability === 'string' ? contractor.availability : undefined;

      return {
        id: String(contractor.id || ''),
        type: 'contractor' as const,
        title: `${firstName} ${lastName}`.trim() || 'Unknown Contractor',
        description: bio || '',
        relevanceScore: calculateTextMatchScore(query, contractor),
        metadata: {
          location,
          rating,
          availability,
        },
      };
    });
  } catch (error) {
    logger.error('Failed to perform full-text contractor search', error, {
      service: 'ai_search',
    });
    return [];
  }
}

/**
 * Calculate relevance score for full-text search based on keyword matching
 */
function calculateTextMatchScore(query: string, record: Record<string, unknown>): number {
  const queryLower = query.toLowerCase();
  let score = 0.5; // Base score for any match

  // Check title/name match
  const title = String(record.title || record.first_name || '').toLowerCase();
  if (title.includes(queryLower)) {
    score += 0.3;
  }

  // Check description/bio match
  const description = String(record.description || record.bio || '').toLowerCase();
  if (description.includes(queryLower)) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

async function searchJobs(
  queryEmbedding: number[],
  filters: SearchFilters,
  limit: number
) {
  try {
    const { data, error } = await serverSupabase
      .rpc('search_jobs_semantic', {
        query_embedding: queryEmbedding,
        category_filter: filters.category,
        location_filter: filters.location,
        price_min: filters.priceRange?.min,
        price_max: filters.priceRange?.max,
        limit: limit,
      });

    if (error) {
      logger.warn('Job search error', {
        service: 'ai_search',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    return (data || []).map((job: Record<string, unknown>) => ({
      id: String(job.id || ''),
      type: 'job' as const,
      title: String(job.title || ''),
      description: String(job.description || ''),
      relevanceScore: typeof job.similarity_score === 'number' ? job.similarity_score : 0.5,
      metadata: {
        location: typeof job.location === 'string' ? job.location : undefined,
        category: typeof job.category === 'string' ? job.category : undefined,
        price: typeof job.budget === 'number' ? job.budget : undefined,
        availability: typeof job.status === 'string' ? job.status : undefined,
      },
    }));
  } catch (error) {
    logger.error('Failed to search jobs', error, {
      service: 'ai_search',
    });
    return [];
  }
}

async function searchContractors(
  queryEmbedding: number[],
  filters: SearchFilters,
  limit: number
) {
  try {
    const { data, error } = await serverSupabase
      .rpc('search_contractors_semantic', {
        query_embedding: queryEmbedding,
        category_filter: filters.category,
        location_filter: filters.location,
        rating_filter: filters.rating,
        limit: limit,
      });

    if (error) {
      logger.warn('Contractor search error', {
        service: 'ai_search',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    return (data || []).map((contractor: Record<string, unknown>) => {
      const firstName = typeof contractor.first_name === 'string' ? contractor.first_name : '';
      const lastName = typeof contractor.last_name === 'string' ? contractor.last_name : '';
      const bio = typeof contractor.bio === 'string' ? contractor.bio : '';
      const specialties = Array.isArray(contractor.specialties) ? contractor.specialties as string[] : [];
      const location = typeof contractor.location === 'string' ? contractor.location : undefined;
      const rating = typeof contractor.rating === 'number' ? contractor.rating : undefined;
      const availability = typeof contractor.availability === 'string' ? contractor.availability : undefined;
      
      return {
        id: String(contractor.id || ''),
        type: 'contractor' as const,
        title: `${firstName} ${lastName}`.trim() || 'Unknown Contractor',
        description: bio || specialties.join(', ') || '',
        relevanceScore: typeof contractor.similarity_score === 'number' ? contractor.similarity_score : 0.5,
        metadata: {
          location,
          category: specialties[0],
          rating,
          availability,
        },
      };
    });
  } catch (error) {
    logger.error('Failed to search contractors', error, {
      service: 'ai_search',
    });
    return [];
  }
}

function rankResults(results: SearchResult[], query: string): SearchResult[] {
  return results
    .map(result => ({
      ...result,
      relevanceScore: calculateRelevanceScore(result, query),
    }))
    .filter(result => result.relevanceScore >= 0.7)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateRelevanceScore(result: SearchResult, query: string): number {
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
  if (result.type === 'contractor' && typeof result.metadata.rating === 'number') {
    score += (result.metadata.rating - 3) * 0.05;
  }

  // Boost score for available contractors
  if (result.type === 'contractor' && result.metadata.availability === 'available') {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

function applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
  return results.filter(result => {
    if (filters.location && typeof result.metadata.location === 'string') {
      if (!result.metadata.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    if (filters.category && typeof result.metadata.category === 'string') {
      if (result.metadata.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
    }

    if (filters.priceRange && typeof result.metadata.price === 'number') {
      const price = result.metadata.price;
      if (filters.priceRange.min !== undefined && price < filters.priceRange.min) {
        return false;
      }
      if (filters.priceRange.max !== undefined && price > filters.priceRange.max) {
        return false;
      }
    }

    if (filters.rating !== undefined && typeof result.metadata.rating === 'number') {
      if (result.metadata.rating < filters.rating) {
        return false;
      }
    }

    return true;
  });
}

function calculateAverageRelevance(results: SearchResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, result) => acc + result.relevanceScore, 0);
  return sum / results.length;
}

/**
 * Sanitize filter object for safe storage
 * OWASP Security: Prevents NoSQL injection and XSS in stored data
 */
function sanitizeFilters(filters: unknown): Record<string, unknown> {
  if (!filters || typeof filters !== 'object') {
    return {};
  }

  const safe: Record<string, unknown> = {};
  const allowedKeys = ['location', 'category', 'priceRange', 'rating'];

  for (const key of allowedKeys) {
    if (key in filters) {
      const value = (filters as Record<string, unknown>)[key];

      if (typeof value === 'string') {
        // Sanitize string values to prevent XSS
        safe[key] = sanitizeText(value, 200);
      } else if (typeof value === 'number' && !isNaN(value)) {
        // Validate and sanitize numeric values
        safe[key] = value;
      } else if (key === 'priceRange' && value && typeof value === 'object') {
        // Special handling for priceRange object
        const priceRange = value as Record<string, unknown>;
        safe[key] = {
          min: typeof priceRange.min === 'number' && !isNaN(priceRange.min) ? priceRange.min : undefined,
          max: typeof priceRange.max === 'number' && !isNaN(priceRange.max) ? priceRange.max : undefined,
        };
      }
    }
  }

  return safe;
}

/**
 * Log search analytics with input sanitization
 * OWASP Security: All user inputs are sanitized before database insertion
 */
async function logSearchAnalytics(analytics: Record<string, unknown>) {
  try {
    // Sanitize all inputs to prevent SQL injection and XSS
    const safeQuery = typeof analytics.query === 'string'
      ? sanitizeText(analytics.query, 500)
      : '';

    const safeFilters = sanitizeFilters(analytics.filters);

    // Validate and sanitize numeric fields
    const resultsCount = typeof analytics.resultsCount === 'number' && !isNaN(analytics.resultsCount)
      ? Math.max(0, Math.floor(analytics.resultsCount))
      : 0;

    const clickThroughRate = typeof analytics.clickThroughRate === 'number' && !isNaN(analytics.clickThroughRate)
      ? Math.max(0, Math.min(1, analytics.clickThroughRate))
      : 0;

    const averageRelevanceScore = typeof analytics.averageRelevanceScore === 'number' && !isNaN(analytics.averageRelevanceScore)
      ? Math.max(0, Math.min(1, analytics.averageRelevanceScore))
      : 0;

    const searchTime = typeof analytics.searchTime === 'number' && !isNaN(analytics.searchTime)
      ? Math.max(0, Math.floor(analytics.searchTime))
      : 0;

    const usedFallback = typeof analytics.usedFallback === 'boolean' ? analytics.usedFallback : false;
    const searchMethod = typeof analytics.searchMethod === 'string' ? analytics.searchMethod : 'semantic';

    await serverSupabase
      .from('search_analytics')
      .insert({
        query: safeQuery,
        results_count: resultsCount,
        click_through_rate: clickThroughRate,
        average_relevance_score: averageRelevanceScore,
        search_time: searchTime,
        filters: safeFilters,
        used_fallback: usedFallback,
        search_method: searchMethod,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    logger.error('Failed to log search analytics', error, {
      service: 'ai_search',
    });
  }
}
