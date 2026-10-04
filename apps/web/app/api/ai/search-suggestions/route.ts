import { NextResponse } from 'next/server';
import { z } from 'zod';


import { withApiHandler } from '@/lib/api/with-api-handler';


const searchSuggestionsSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(10),
});

// auth-check: ok — public typeahead surface for the landing-page
// search bar. No user-specific data; rate-limited per IP.
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 20 } },
  async (request) => {
    const body = await request.json();
    const parsed = searchSuggestionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'query (string, 1-200 chars) is required' },
        { status: 400 }
      );
    }
    const { query, limit } = parsed.data;

    // Public suggestions must never sample private searches or job addresses.
    // Additional suggestion sources need an explicitly public curated dataset.
    const allSuggestions = await getCategorySuggestions(query, limit);
    const rankedSuggestions = rankSuggestions(allSuggestions, query);

    return NextResponse.json({
      suggestions: rankedSuggestions.slice(0, limit),
    });
  }
);

async function getCategorySuggestions(partialQuery: string, limit: number) {
  const categories = [
    'plumbing',
    'electrical',
    'HVAC',
    'roofing',
    'flooring',
    'kitchen',
    'bathroom',
    'painting',
    'landscaping',
    'cleaning',
  ];
  return categories
    .filter((c) => c.toLowerCase().includes(partialQuery.toLowerCase()))
    .slice(0, limit)
    .map((c) => ({ text: c, type: 'category' as const, popularity: 1 }));
}

interface SearchSuggestion {
  text: string;
  type?: 'query' | 'category' | 'location';
  popularity?: number;
  relevanceScore?: number;
}

function rankSuggestions(
  suggestions: SearchSuggestion[],
  partialQuery: string
): SearchSuggestion[] {
  return suggestions
    .map((s) => ({ ...s, relevanceScore: calculateRelevance(s, partialQuery) }))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

function calculateRelevance(
  suggestion: SearchSuggestion,
  query: string
): number {
  const text = (suggestion.text || '').toLowerCase();
  const q = query.toLowerCase();
  if (text.startsWith(q)) return 1.0;
  if (text.includes(q)) return 0.8;
  return (suggestion.popularity || 0) * 0.1;
}
