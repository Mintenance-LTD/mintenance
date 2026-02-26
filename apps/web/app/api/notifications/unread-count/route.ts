import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 }, csrf: false },
  async (_request, { user }) => {
    const { count, error } = await serverSupabase
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

    return NextResponse.json({ count: count || 0 });
  },
);
