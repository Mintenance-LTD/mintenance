import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/help/articles/popular - get popular help articles with view counts.
 */
export const GET = withApiHandler({ auth: false }, async () => {
  const articles = [
    { title: 'How to create an account', category: 'Getting Started' },
    { title: 'How to post a job', category: 'Posting Jobs' },
    { title: 'How payments work', category: 'Payments & Billing' },
    { title: 'Receiving and comparing quotes', category: 'Bids & Quotes' },
    { title: 'Finding jobs near you', category: 'For Tradespeople' },
    { title: 'Our verification process', category: 'Safety & Trust' },
  ];

  const articlesWithViews = await Promise.all(
    articles.map(async (article) => {
      const { count } = await serverSupabase
        .from('help_article_views')
        .select('id', { count: 'exact', head: true })
        .eq('article_title', article.title);

      const views = count || 0;
      const formatViews = (num: number): string => {
        if (num >= 1000) {
          const k = num / 1000;
          return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
        }
        return num.toString();
      };

      return { ...article, views: formatViews(views), viewCount: views };
    }),
  );

  const popularArticles = articlesWithViews
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 6);

  return NextResponse.json({ articles: popularArticles });
});
