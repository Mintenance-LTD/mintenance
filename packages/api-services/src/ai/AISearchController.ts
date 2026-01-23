/**
 * AI Search Controller - Semantic and full-text search with fallback
 */
import { AISearchService } from './AISearchService';
import { logger } from '@mintenance/shared';
import { EmbeddingService } from './EmbeddingService';
import { SearchRankingService } from './SearchRankingService';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<Response>;
}
const NextResponse = {
  json(data: Record<string, unknown>, init?: ResponseInit): unknown {
    return {
      body: JSON.stringify(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    };
  }
};
interface User {
  id: string;
  email: string;
  role: string;
}
// Mock functions
async function getCurrentUserFromCookies(): Promise<User | null> {
  return { id: 'user-123', email: 'user@example.com', role: 'homeowner' };
}
async function requireCSRF(request: NextRequest): Promise<void> {
  // CSRF validation
}
async function checkRateLimit(request: NextRequest, options: Record<string, unknown>) {
  return {
    allowed: true,
    remaining: 10,
    resetTime: Date.now() + 60000,
    retryAfter: 60
  };
}
function handleAPIError(error: unknown): unknown {
  logger.error('AI Search Error:', error as any);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
interface SearchFilters {
  category?: string;
  location?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  rating?: number;
  availability?: string;
  radius?: number;
  skills?: string[];
}
interface SearchResult {
  id: string;
  type: 'job' | 'contractor' | 'property';
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
  highlights?: string[];
}
export class AISearchController {
  private searchService: AISearchService;
  private embeddingService: EmbeddingService;
  private rankingService: SearchRankingService;
  constructor() {
    const config = {
      supabase: {} as any, // Mock Supabase
    };
    this.searchService = new AISearchService(config);
    this.embeddingService = new EmbeddingService(config);
    this.rankingService = new SearchRankingService(config);
  }
  /**
   * POST /api/ai/search - Semantic search with fallback
   */
  async search(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting for expensive AI operations
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000, // 1 minute
        maxRequests: 10, // 10 AI searches per minute
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      // Parse and validate request
      const { query, filters, limit = 20, searchType = 'hybrid' } = await request.json();
      if (!query || typeof query !== 'string') {
        return NextResponse.json(
          { error: 'Query is required and must be a string' },
          { status: 400 }
        );
      }
      // Sanitize query
      const sanitizedQuery = this.sanitizeQuery(query);
      // Get user context for personalization
      const user = await getCurrentUserFromCookies();
      let searchResults: SearchResult[] = [];
      let searchMethod = 'semantic';
      let usedFallback = false;
      try {
        if (searchType === 'hybrid' || searchType === 'semantic') {
          // Generate embedding for semantic search
          const embedding = await this.embeddingService.generateEmbedding(
            sanitizedQuery,
            { timeout: 5000 }
          );
          // Perform semantic search
          searchResults = await this.searchService.semanticSearch({
            embedding,
            query: sanitizedQuery,
            filters,
            limit: limit * 2, // Get more results for ranking
            userId: user?.id
          });
          searchMethod = 'semantic';
        }
      } catch (embeddingError) {
        logger.warn('Embedding generation failed, falling back to full-text search:', embeddingError as any);
        usedFallback = true;
      }
      // Fallback to full-text search if needed
      if (usedFallback || searchType === 'fulltext' || searchResults.length === 0) {
        searchResults = await this.searchService.fullTextSearch({
          query: sanitizedQuery,
          filters,
          limit: limit * 2,
          userId: user?.id
        });
        searchMethod = 'fulltext';
        usedFallback = true;
      }
      // Rank and re-score results
      const rankedResults = await this.rankingService.rankResults(
        searchResults,
        sanitizedQuery,
        {
          userPreferences: user ? await this.getUserPreferences(user.id) : undefined,
          boostRecent: true,
          diversify: true
        }
      );
      // Apply final filtering and limit
      const finalResults = this.applyPostProcessing(rankedResults, filters)
        .slice(0, limit);
      // Log search analytics
      await this.logSearchAnalytics({
        query: sanitizedQuery,
        filters,
        resultsCount: finalResults.length,
        searchMethod,
        usedFallback,
        userId: user?.id
      });
      return NextResponse.json({
        results: finalResults,
        count: finalResults.length,
        total: rankedResults.length,
        searchMethod,
        usedFallback,
        query: sanitizedQuery
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/ai/search-suggestions - Get AI-powered search suggestions
   * Alias for suggest() to match route naming convention
   */
  async getSuggestions(request: NextRequest): Promise<Response> {
    return this.suggest(request);
  }
  /**
   * POST /api/ai/search/suggest - Get search suggestions
   */
  async suggest(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30, // More lenient for suggestions
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const { query, limit = 10 } = await request.json();
      if (!query || typeof query !== 'string') {
        return NextResponse.json(
          { error: 'Query is required' },
          { status: 400 }
        );
      }
      // Get suggestions from multiple sources
      const [
        popularSearches,
        recentSearches,
        autocompleteSuggestions
      ] = await Promise.all([
        this.searchService.getPopularSearches(query, limit),
        this.searchService.getRecentSearches(query, limit),
        this.searchService.getAutocompleteSuggestions(query, limit)
      ]);
      // Combine and deduplicate suggestions
      const allSuggestions = this.combineSuggestions(
        popularSearches,
        recentSearches,
        autocompleteSuggestions
      );
      return NextResponse.json({
        suggestions: allSuggestions.slice(0, limit)
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/ai/search/trending - Get trending searches
   */
  async getTrending(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const trending = await this.searchService.getTrendingSearches({
        category,
        limit,
        timeRange: '7d'
      });
      return NextResponse.json({
        trending,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/ai/search/similar - Find similar items
   */
  async findSimilar(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const { itemId, itemType, limit = 10 } = await request.json();
      if (!itemId || !itemType) {
        return NextResponse.json(
          { error: 'Item ID and type are required' },
          { status: 400 }
        );
      }
      // Get item embedding
      const itemEmbedding = await this.searchService.getItemEmbedding(itemId, itemType);
      if (!itemEmbedding) {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }
      // Find similar items using cosine similarity
      const similarItems = await this.searchService.findSimilarByEmbedding(
        itemEmbedding,
        itemType,
        {
          excludeId: itemId,
          limit
        }
      );
      return NextResponse.json({
        items: similarItems,
        count: similarItems.length
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/ai/search/feedback - Record search feedback
   */
  async recordFeedback(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 100,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      const { searchId, resultId, action, position, query } = await request.json();
      if (!searchId || !action) {
        return NextResponse.json(
          { error: 'Search ID and action are required' },
          { status: 400 }
        );
      }
      // Record the feedback
      await this.searchService.recordSearchFeedback({
        searchId,
        resultId,
        action, // 'click', 'save', 'ignore', 'report'
        position,
        query,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      // Update search relevance scores based on feedback
      if (action === 'click' && resultId) {
        await this.rankingService.updateRelevanceScore(
          query,
          resultId,
          position,
          true
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Feedback recorded successfully'
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `ai-search:${ip}`;
  }
  private rateLimitResponse(rateLimitResult: unknown): unknown {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(rateLimitResult.limit || 10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  }
  private sanitizeQuery(query: string): string {
    // Remove potentially dangerous characters and normalize
    return query
      .trim()
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 500); // Limit length
  }
  private async getUserPreferences(userId: string): Promise<Response> {
    // Would fetch user search preferences from database
    return {
      preferredCategories: [],
      preferredLocations: [],
      priceRange: null
    };
  }
  private applyPostProcessing(
    results: SearchResult[],
    filters: SearchFilters
  ): SearchResult[] {
    let processed = [...results];
    // Additional filtering that wasn't done in the database
    if (filters.rating) {
      processed = processed.filter(r =>
        (r.metadata.rating || 0) >= filters.rating!
      );
    }
    // Remove duplicates
    const seen = new Set<string>();
    processed = processed.filter(r => {
      const key = `${r.type}:${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return processed;
  }
  private combineSuggestions(
    popular: string[],
    recent: string[],
    autocomplete: string[]
  ): string[] {
    const combined = new Map<string, number>();
    // Weight different sources
    popular.forEach((s, i) => {
      combined.set(s, (combined.get(s) || 0) + (popular.length - i) * 3);
    });
    recent.forEach((s, i) => {
      combined.set(s, (combined.get(s) || 0) + (recent.length - i) * 2);
    });
    autocomplete.forEach((s, i) => {
      combined.set(s, (combined.get(s) || 0) + (autocomplete.length - i));
    });
    // Sort by weight and return
    return Array.from(combined.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([suggestion]) => suggestion);
  }
  private async logSearchAnalytics(analytics: unknown): Promise<void> {
    // Would log to analytics service
    logger.info('Search analytics:', analytics);
  }
}
// Export singleton instance
export const aiSearchController = new AISearchController();
