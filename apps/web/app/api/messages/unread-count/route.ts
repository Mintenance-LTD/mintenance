import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export const GET = withApiHandler({}, async (_request, { user }) => {
  // Count unread messages where user is the receiver (actual DB schema uses `read` boolean)
  const { count, error } = await serverSupabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('read', false);

  if (error) {
    logger.error('Failed to load unread count', error, {
      service: 'messages',
      userId: user.id,
    });
    throw error;
  }

  return NextResponse.json({ count: count ?? 0 });
});
