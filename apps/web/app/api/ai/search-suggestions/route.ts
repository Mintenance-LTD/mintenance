import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const { query, limit = 10 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const [querySuggestions, categorySuggestions, locationSuggestions] = await Promise.all([
      getQuerySuggestions(query, limit),
      getCategorySuggestions(query, limit),
      getLocationSuggestions(query, limit),
    ]);

    const allSuggestions = [...querySuggestions, ...categorySuggestions, ...locationSuggestions];
    const rankedSuggestions = rankSuggestions(allSuggestions, query);

    return NextResponse.json({
      suggestions: rankedSuggestions.slice(0, limit),
    });
  } catch (error) {
    logger.error('Search suggestions error', error, {
      service: 'ai_search_suggestions',
    });
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

async function getQuerySuggestions(partialQuery: string, limit: number) {
  try {
    const { data, error } = await serverSupabase
      .from('search_analytics')
      .select('query')
      .ilike('query', `${partialQuery}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(item => ({
      text: item.query,
      type: 'query' as const,
      popularity: 1,
    }));
  } catch (error) {
    return [];
  }
}

async function getCategorySuggestions(partialQuery: string, limit: number) {
  const categories = [
    'plumbing', 'electrical', 'HVAC', 'roofing', 'flooring',
    'kitchen', 'bathroom', 'painting', 'landscaping', 'cleaning',
  ];

  return categories
    .filter(category => category.toLowerCase().includes(partialQuery.toLowerCase()))
    .slice(0, limit)
    .map(category => ({
      text: category,
      type: 'category' as const,
      popularity: 1,
    }));
}

async function getLocationSuggestions(partialQuery: string, limit: number) {
  try {
    const { data, error } = await serverSupabase
      .from('jobs')
      .select('location')
      .ilike('location', `%${partialQuery}%`)
      .limit(limit);

    if (error) throw error;

    const uniqueLocations = [...new Set((data || []).map(item => item.location))];
    return uniqueLocations.map(location => ({
      text: location,
      type: 'location' as const,
      popularity: 1,
    }));
  } catch (error) {
    return [];
  }
}

interface SearchSuggestion {
  text: string;
  type?: 'query' | 'category' | 'location';
  popularity?: number;
  relevanceScore?: number;
}

function rankSuggestions(suggestions: SearchSuggestion[], partialQuery: string): SearchSuggestion[] {
  return suggestions
    .map(suggestion => ({
      ...suggestion,
      relevanceScore: calculateSuggestionRelevance(suggestion, partialQuery),
    }))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

function calculateSuggestionRelevance(suggestion: SearchSuggestion, partialQuery: string): number {
  const suggestionText = typeof suggestion.text === 'string' ? suggestion.text : '';
  const suggestionLower = suggestionText.toLowerCase();
  const queryLower = partialQuery.toLowerCase();

  if (suggestionLower.startsWith(queryLower)) {
    return 1.0;
  }
  if (suggestionLower.includes(queryLower)) {
    return 0.8;
  }
  return (suggestion.popularity || 0) * 0.1;
}
