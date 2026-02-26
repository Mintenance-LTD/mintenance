import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';

const trackViewSchema = z.object({
  articleTitle: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
});

/**
 * Track a view for a help article
 * Auth is optional — anonymous views are allowed
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async (request) => {
    const body = await request.json();
    const parsed = trackViewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Article title and category are required');
    }
    const { articleTitle, category } = parsed.data;

    // Optional auth — null for anonymous views
    const user = await getCurrentUserFromCookies();
    const userId = user?.id || null;

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { error } = await serverSupabase
      .from('help_article_views')
      .insert({
        article_title: articleTitle,
        category: category,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      logger.error('Error tracking help article view', error, {
        service: 'help_articles',
        articleTitle,
        category,
        userId: userId || undefined,
      });
      throw new InternalServerError('Failed to track help article view');
    }

    return NextResponse.json({ success: true });
  }
);
