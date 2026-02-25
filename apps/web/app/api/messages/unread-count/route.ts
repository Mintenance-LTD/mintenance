import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export const GET = withApiHandler({}, async (_request, { user }) => {
  // Get message_threads where user is a participant
  const { data: userThreads } = await serverSupabase
    .from('message_threads')
    .select('id')
    .contains('participant_ids', [user.id]);

  const threadIds = (userThreads ?? []).map((t) => t.id);

  let unreadCount = 0;
  if (threadIds.length > 0) {
    const { data: msgs, error } = await serverSupabase
      .from('messages')
      .select('id, read_by')
      .in('thread_id', threadIds)
      .neq('sender_id', user.id);

    if (error) {
      logger.error('Failed to load unread count', error, {
        service: 'messages',
        userId: user.id,
      });
      throw error;
    }

    unreadCount = (msgs ?? []).filter((m: { id: string; read_by: string[] | null }) => {
      const readBy = Array.isArray(m.read_by) ? m.read_by : [];
      return !readBy.includes(user.id);
    }).length;
  }

  return NextResponse.json({ count: unreadCount });
});
