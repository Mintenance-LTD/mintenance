import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { fetchWebUnreadCount } from '@/lib/notifications/inbox';
import { syncPropertyInvitationNotifications } from '@/lib/notifications/property-invitations';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 }, csrf: false },
  async (_request, { user }) => {
    await syncPropertyInvitationNotifications(user);
    const { count, error } =
      user.role === 'homeowner' || user.role === 'contractor'
        ? { count: await fetchWebUnreadCount(user.id), error: null }
        : await serverSupabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

    if (error) {
      logger.error('Unread count error', error, {
        service: 'notifications',
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json(
      { count: count || 0 },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  }
);
