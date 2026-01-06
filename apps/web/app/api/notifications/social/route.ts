import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required');
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Build query for social notifications
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .or('type.eq.post_liked,type.eq.comment_added,type.eq.comment_replied,type.eq.new_follower')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      logger.error('Error fetching social notifications', notificationsError, {
        service: 'notifications',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch notifications');
    }

    const formattedNotifications = (notifications || []).map((notif: Record<string, unknown>) => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      read: notif.read || false,
      action_url: notif.action_url,
      created_at: notif.created_at,
    }));

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .or('type.eq.post_liked,type.eq.comment_added,type.eq.comment_replied,type.eq.new_follower');

    return NextResponse.json({
      notifications: formattedNotifications,
      unread_count: unreadCount || 0,
      total: formattedNotifications.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error in GET /api/notifications/social', error, {
      service: 'notifications',
    });
    throw new InternalServerError('Internal server error');
  }
}

