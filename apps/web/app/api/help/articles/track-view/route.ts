import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

/**
 * Track a view for a help article
 */
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const body = await request.json();
    const { articleTitle, category } = body;

    if (!articleTitle || !category) {
      throw new BadRequestError('Article title and category are required');
    }

    // Get current user (optional - can be null for anonymous views)
    const user = await getCurrentUserFromCookies();
    const userId = user?.id || null;

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert view record
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
  } catch (error) {
    return handleAPIError(error);
  }
}

