import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function POST(request: NextRequest) {
  try {
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
    console.error('Search suggestions error:', error);
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

function rankSuggestions(suggestions: any[], partialQuery: string) {
  return suggestions
    .map(suggestion => ({
      ...suggestion,
      relevanceScore: calculateSuggestionRelevance(suggestion, partialQuery),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateSuggestionRelevance(suggestion: any, partialQuery: string): number {
  const suggestionLower = suggestion.text.toLowerCase();
  const queryLower = partialQuery.toLowerCase();

  if (suggestionLower.startsWith(queryLower)) {
    return 1.0;
  }
  if (suggestionLower.includes(queryLower)) {
    return 0.8;
  }
  return suggestion.popularity * 0.1;
}
