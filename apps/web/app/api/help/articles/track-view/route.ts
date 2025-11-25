import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

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
      return NextResponse.json(
        { error: 'Article title and category are required' },
        { status: 400 }
      );
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
        userId,
      });
      // Don't fail the request if tracking fails
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in track-view endpoint', error, {
      service: 'help_articles',
    });
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}

