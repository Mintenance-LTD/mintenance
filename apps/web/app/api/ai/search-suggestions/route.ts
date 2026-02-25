import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

const searchSuggestionsSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(10),
});

export const POST = withApiHandler({ auth: false, rateLimit: { maxRequests: 20 } }, async (request) => {
  const body = await request.json();
  const parsed = searchSuggestionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'query (string, 1-200 chars) is required' }, { status: 400 });
  }
  const { query, limit } = parsed.data;

  const [querySuggestions, categorySuggestions, locationSuggestions] = await Promise.all([
    getQuerySuggestions(query, limit),
    getCategorySuggestions(query, limit),
    getLocationSuggestions(query, limit),
  ]);

  const allSuggestions = [...querySuggestions, ...categorySuggestions, ...locationSuggestions];
  const rankedSuggestions = rankSuggestions(allSuggestions, query);

  return NextResponse.json({ suggestions: rankedSuggestions.slice(0, limit) });
});

async function getQuerySuggestions(partialQuery: string, limit: number) {
  try {
    const { data, error } = await serverSupabase.from('search_analytics').select('query').ilike('query', `${partialQuery}%`).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map(item => ({ text: item.query, type: 'query' as const, popularity: 1 }));
  } catch { return []; }
}

async function getCategorySuggestions(partialQuery: string, limit: number) {
  const categories = ['plumbing', 'electrical', 'HVAC', 'roofing', 'flooring', 'kitchen', 'bathroom', 'painting', 'landscaping', 'cleaning'];
  return categories.filter(c => c.toLowerCase().includes(partialQuery.toLowerCase())).slice(0, limit).map(c => ({ text: c, type: 'category' as const, popularity: 1 }));
}

async function getLocationSuggestions(partialQuery: string, limit: number) {
  try {
    const { data, error } = await serverSupabase.from('jobs').select('location').ilike('location', `%${partialQuery}%`).limit(limit);
    if (error) throw error;
    return [...new Set((data || []).map(item => item.location))].map(location => ({ text: location, type: 'location' as const, popularity: 1 }));
  } catch { return []; }
}

interface SearchSuggestion { text: string; type?: 'query' | 'category' | 'location'; popularity?: number; relevanceScore?: number; }

function rankSuggestions(suggestions: SearchSuggestion[], partialQuery: string): SearchSuggestion[] {
  return suggestions.map(s => ({ ...s, relevanceScore: calculateRelevance(s, partialQuery) })).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

function calculateRelevance(suggestion: SearchSuggestion, query: string): number {
  const text = (suggestion.text || '').toLowerCase();
  const q = query.toLowerCase();
  if (text.startsWith(q)) return 1.0;
  if (text.includes(q)) return 0.8;
  return (suggestion.popularity || 0) * 0.1;
}
