import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/notifications/social - fetch social notifications for contractors.
 */
export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Build query for social notifications
    let query = serverSupabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .or(
        'type.eq.post_liked,type.eq.comment_added,type.eq.comment_replied,type.eq.new_follower'
      )
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

    const formattedNotifications = (notifications || []).map(
      (notif: Record<string, unknown>) => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: notif.read || false,
        action_url: notif.action_url,
        created_at: notif.created_at,
      })
    );

    // Get unread count
    const { count: unreadCount } = await serverSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .or(
        'type.eq.post_liked,type.eq.comment_added,type.eq.comment_replied,type.eq.new_follower'
      );

    return NextResponse.json({
      notifications: formattedNotifications,
      unread_count: unreadCount || 0,
      total: formattedNotifications.length,
      limit,
      offset,
    });
  }
);
