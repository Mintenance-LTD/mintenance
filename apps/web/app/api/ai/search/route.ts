import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';

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
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

async function searchJobs(
  queryEmbedding: number[],
  filters: any,
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
      console.warn('Job search error:', error);
      return [];
    }

    return (data || []).map((job: any) => ({
      id: job.id,
      type: 'job' as const,
      title: job.title,
      description: job.description,
      relevanceScore: job.similarity_score || 0.5,
      metadata: {
        location: job.location,
        category: job.category,
        price: job.budget,
        availability: job.status,
      },
    }));
  } catch (error) {
    console.error('Failed to search jobs', error);
    return [];
  }
}

async function searchContractors(
  queryEmbedding: number[],
  filters: any,
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
      console.warn('Contractor search error:', error);
      return [];
    }

    return (data || []).map((contractor: any) => ({
      id: contractor.id,
      type: 'contractor' as const,
      title: `${contractor.first_name} ${contractor.last_name}`,
      description: contractor.bio || contractor.specialties?.join(', ') || '',
      relevanceScore: contractor.similarity_score || 0.5,
      metadata: {
        location: contractor.location,
        category: contractor.specialties?.[0],
        rating: contractor.rating,
        availability: contractor.availability,
      },
    }));
  } catch (error) {
    console.error('Failed to search contractors', error);
    return [];
  }
}

function rankResults(results: any[], query: string) {
  return results
    .map(result => ({
      ...result,
      relevanceScore: calculateRelevanceScore(result, query),
    }))
    .filter(result => result.relevanceScore >= 0.7)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateRelevanceScore(result: any, query: string): number {
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
    score += (result.metadata.rating - 3) * 0.05;
  }

  // Boost score for available contractors
  if (result.type === 'contractor' && result.metadata.availability === 'available') {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

function applyFilters(results: any[], filters: any) {
  return results.filter(result => {
    if (filters.location && result.metadata.location) {
      if (!result.metadata.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    if (filters.category && result.metadata.category) {
      if (result.metadata.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
    }

    if (filters.priceRange && result.metadata.price) {
      const price = result.metadata.price;
      if (price < filters.priceRange.min || price > filters.priceRange.max) {
        return false;
      }
    }

    if (filters.rating && result.metadata.rating) {
      if (result.metadata.rating < filters.rating) {
        return false;
      }
    }

    return true;
  });
}

function calculateAverageRelevance(results: any[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, result) => acc + result.relevanceScore, 0);
  return sum / results.length;
}

async function logSearchAnalytics(analytics: any) {
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
    console.error('Failed to log search analytics', error);
  }
}
