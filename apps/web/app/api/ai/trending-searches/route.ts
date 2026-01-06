import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Trending searches endpoint
 * OWASP Security: Rate limited to 30 requests per minute per IP
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - OWASP best practice
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `ai-trending:${identifier}`,
      windowMs: 60000, // 1 minute
      maxRequests: 30, // 30 requests per minute
    });

    if (!rateLimitResult.allowed) {
      logger.warn('AI trending rate limit exceeded', {
        service: 'ai_trending_searches',
        identifier,
        remaining: rateLimitResult.remaining,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const { data, error } = await serverSupabase
      .from('search_analytics')
      .select('query')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Trending searches error', error, {
        service: 'ai_trending_searches',
      });
      return NextResponse.json({ trending: [] });
    }

    // Count occurrences
    const queryCounts = new Map<string, number>();
    (data || []).forEach(item => {
      queryCounts.set(item.query, (queryCounts.get(item.query) || 0) + 1);
    });

    const trending = Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({
        text: query,
        type: 'query' as const,
        popularity: count,
      }));

    return NextResponse.json({ trending });
  } catch (error) {
    logger.error('Trending searches API error', error, {
      service: 'ai_trending_searches',
    });
    return NextResponse.json({ trending: [] });
  }
}
