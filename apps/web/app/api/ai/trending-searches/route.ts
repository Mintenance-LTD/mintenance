import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
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
