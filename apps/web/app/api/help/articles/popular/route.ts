import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Get popular help articles with view counts
 */
export async function GET() {
  try {
    // Define the articles we want to show
    const articles = [
      { title: 'How to create an account', category: 'Getting Started' },
      { title: 'How to post a job', category: 'Posting Jobs' },
      { title: 'How payments work', category: 'Payments & Billing' },
      { title: 'Receiving and comparing quotes', category: 'Bids & Quotes' },
      { title: 'Finding jobs near you', category: 'For Tradespeople' },
      { title: 'Our verification process', category: 'Safety & Trust' },
    ];

    // Fetch view counts for each article
    const articlesWithViews = await Promise.all(
      articles.map(async (article) => {
        const { count } = await serverSupabase
          .from('help_article_views')
          .select('id', { count: 'exact', head: true })
          .eq('article_title', article.title);

        const views = count || 0;

        // Format views: 12500 -> "12.5k", 1000 -> "1k", 500 -> "500"
        const formatViews = (num: number): string => {
          if (num >= 1000) {
            const k = num / 1000;
            return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
          }
          return num.toString();
        };

        return {
          ...article,
          views: formatViews(views),
          viewCount: views,
        };
      })
    );

    // Sort by view count (descending) and take top 6
    const popularArticles = articlesWithViews
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 6);

    return NextResponse.json({ articles: popularArticles });
  } catch (error) {
    logger.error('Error fetching popular articles', error, {
      service: 'help_articles',
    });
    // Return empty array on error
    return NextResponse.json({ articles: [] });
  }
}

