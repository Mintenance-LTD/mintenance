import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

const searchSuggestionsSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(10),
});

/**
 * AI-powered search suggestions endpoint
 * OWASP Security: Rate limited to 20 requests per minute per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - OWASP best practice
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `ai-suggestions:${identifier}`,
      windowMs: 60000, // 1 minute
      maxRequests: 20, // 20 requests per minute
    });

    if (!rateLimitResult.allowed) {
      logger.warn('AI suggestions rate limit exceeded', {
        service: 'ai_search_suggestions',
        identifier,
        remaining: rateLimitResult.remaining,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    // CSRF protection
    await requireCSRF(request);
    const body = await request.json();
    const parsed = searchSuggestionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'query (string, 1-200 chars) is required' },
        { status: 400 }
      );
    }
    const { query, limit } = parsed.data;

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
