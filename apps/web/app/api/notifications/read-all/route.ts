import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    // Mark all notifications as read for this user
    const { error } = await serverSupabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      logger.error('Error marking all as read', error, {
        service: 'notifications',
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ success: true });
  },
);
