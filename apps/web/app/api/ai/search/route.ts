import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import type { SearchFilters } from '@/lib/services/AISearchService';

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

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const { query, filters, limit = 20 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const embeddingResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/ai/generate-embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: query.trim(),
        model: 'text-embedding-3-small',
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding');
    }

    const { embedding } = await embeddingResponse.json();

    // Search jobs and contractors in parallel
    const [jobResults, contractorResults] = await Promise.all([
      searchJobs(embedding, filters, limit),
      searchContractors(embedding, filters, limit),
    ]);

    // Combine and rank results
    const allResults = [...jobResults, ...contractorResults];
    const rankedResults = rankResults(allResults, query);

    // Apply additional filters
    const filteredResults = applyFilters(rankedResults, filters);

    // Log search analytics
    await logSearchAnalytics({
      query,
      resultsCount: filteredResults.length,
      clickThroughRate: 0,
      averageRelevanceScore: calculateAverageRelevance(filteredResults),
      searchTime: 0,
      filters,
    });

    return NextResponse.json({
      results: filteredResults.slice(0, limit),
      count: filteredResults.length,
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

async function logSearchAnalytics(analytics: Record<string, unknown>) {
  try {
    await serverSupabase
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
  } catch (error) {
    logger.error('Failed to log search analytics', error, {
      service: 'ai_search',
    });
  }
}
